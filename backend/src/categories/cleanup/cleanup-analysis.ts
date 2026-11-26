import { CATEGORY_SCOPES, CATEGORY_SEPARATOR, type CategoryScope } from "../categories.constants";
import type { Category } from "../category.model";

/** Entries per scope that sit in one category name. */
export type ScopeCounts = Partial<Record<CategoryScope, number>>;

/** "Büro - Licht" could become the subfolder "Büro/Licht". */
export type SplitProposal = {
  key: string;
  kind: "split";
  from: string;
  to: string;
  /** Spaced dash ("Büro - Licht"); an unspaced one ("Klima-Sensoren") may belong to the name. */
  isCertain: boolean;
  counts: ScopeCounts;
};

/** "Routine" and "Routinen" look like the same folder. */
export type MergeProposal = {
  key: string;
  kind: "merge";
  names: string[];
  /** Suggested common name: the one with the most entries. */
  to: string;
  counts: Record<string, ScopeCounts>;
};

export type CleanupProposal = SplitProposal | MergeProposal;

/** One confirmed change: the category name `from` gets the folder path `to`, in every scope. */
export type CleanupChange = { from: string; to: string };

/**
 * One step in HA. A rename keeps the category and its entries; a merge moves the entries into the
 * category that already has the target name in this scope, then deletes the emptied one.
 */
export type CleanupOperation = {
  scope: CategoryScope;
  kind: "rename" | "merge";
  from: string;
  to: string;
  categoryId: string;
  /** Merge only: the category the entries move into. */
  targetCategoryId: string | null;
  entityIds: string[];
};

export type ScopeCategories = Record<CategoryScope, Category[]>;
export type ScopeAssignments = Record<CategoryScope, Map<string, string[]>>;

/** "Büro - Licht" (spaced) or "Büro-Licht" (unspaced); the first dash splits. */
const DASH_SPLIT = /^(.+?)(\s+[-–]\s+|[-–])(.+)$/;
/** Plural and inflection endings ("Routine", "Routinen", "Routines"). */
const WORD_ENDINGS = ["en", "n", "e", "s"];
/** Shorter forms match too much ("Bad" and "Bade" are different things). */
const MIN_STEM_LENGTH = 4;

export const PROPOSAL_KEY_PREFIX = { split: "split:", merge: "merge:" } as const;
const MERGE_KEY_SEPARATOR = "|";

/**
 * The name and every form with one ending cut off. Two names belong together when they share a
 * form: "Routine" {routine, routin}, "Routines" {routines, routine}, "Routinen" {…, routine, routin}.
 */
function nameForms(name: string): string[] {
  const lower = name.toLowerCase().trim();
  const cut = WORD_ENDINGS.filter((ending) => lower.endsWith(ending)).map((ending) =>
    lower.slice(0, -ending.length),
  );

  return [lower, ...cut].filter((form) => form.length >= MIN_STEM_LENGTH);
}

/** Groups names that share a form, also through a third name (union-find). */
function groupSimilar(names: string[]): string[][] {
  const parent = new Map(names.map((name) => [name, name]));
  const root = (name: string): string => {
    const up = parent.get(name) ?? name;
    return up === name ? name : root(up);
  };
  const firstWithForm = new Map<string, string>();

  for (const name of names) {
    for (const form of nameForms(name)) {
      const other = firstWithForm.get(form);

      if (other === undefined) firstWithForm.set(form, name);
      else parent.set(root(name), root(other));
    }
  }

  const groups = new Map<string, string[]>();

  for (const name of names) groups.set(root(name), [...(groups.get(root(name)) ?? []), name]);

  return [...groups.values()].filter((group) => group.length > 1);
}

/** Entries per scope and category name. */
function countByName({
  categories,
  assignments,
}: {
  categories: ScopeCategories;
  assignments: ScopeAssignments;
}) {
  const counts = new Map<string, ScopeCounts>();

  for (const scope of CATEGORY_SCOPES) {
    for (const category of categories[scope]) {
      const entryCount = assignments[scope].get(category.categoryId)?.length ?? 0;
      const forName = counts.get(category.name) ?? {};
      forName[scope] = (forName[scope] ?? 0) + entryCount;
      counts.set(category.name, forName);
    }
  }

  return counts;
}

const total = (counts: ScopeCounts): number =>
  Object.values(counts).reduce((sum, count) => sum + count, 0);

export type FindCleanupProposalsOptions = {
  categories: ScopeCategories;
  assignments: ScopeAssignments;
  /** Keys the user hid ("split:…", "merge:…"). */
  ignored: ReadonlySet<string>;
};

/**
 * Finds old flat categories that fake nesting with dashes, and near-duplicate names.
 *
 * Only top-level names with entries are looked at: a name with "/" is already a real folder, and an
 * empty category (HA keeps those the user made) does not show in the tree, so converting it would
 * change nothing visible. Nothing here is applied automatically; the user confirms every line
 * (dashes also occur inside plain names).
 */
export function findCleanupProposals({
  categories,
  assignments,
  ignored,
}: FindCleanupProposalsOptions): CleanupProposal[] {
  const counts = countByName({ categories, assignments });
  const flatNames = [...counts.keys()]
    .filter((name) => !name.includes(CATEGORY_SEPARATOR) && total(counts.get(name) ?? {}) > 0)
    .sort((a, b) => a.localeCompare(b));

  const splits: SplitProposal[] = [];
  const plainNames: string[] = [];

  for (const name of flatNames) {
    const match = DASH_SPLIT.exec(name);

    if (match) {
      const [, head, dash, tail] = match;
      splits.push({
        key: PROPOSAL_KEY_PREFIX.split + name,
        kind: "split",
        from: name,
        to: head.trim() + CATEGORY_SEPARATOR + tail.trim(),
        isCertain: dash.trim() !== dash,
        counts: counts.get(name) ?? {},
      });
      continue;
    }

    plainNames.push(name);
  }

  const merges: MergeProposal[] = groupSimilar(plainNames).map((names) => {
    const nameCounts = Object.fromEntries(names.map((name) => [name, counts.get(name) ?? {}]));
    // Most entries wins; on a tie the longer name, usually the plural ("Routines").
    const biggest = [...names].sort(
      (a, b) => total(nameCounts[b]) - total(nameCounts[a]) || b.length - a.length,
    )[0];

    return {
      key: PROPOSAL_KEY_PREFIX.merge + names.join(MERGE_KEY_SEPARATOR),
      kind: "merge",
      names,
      to: biggest,
      counts: nameCounts,
    };
  });

  return [...splits, ...merges].filter((proposal) => !ignored.has(proposal.key));
}

export type PlanCleanupOptions = {
  /** Already normalized paths. */
  changes: CleanupChange[];
  categories: ScopeCategories;
  assignments: ScopeAssignments;
};

/**
 * Turns confirmed changes into HA steps, scope by scope.
 *
 * Changes run in order. When the target name already exists in a scope (from the start, or
 * because an earlier change produced it, like "Haus - Personen" and "Haus-Personen" both going to
 * "Haus/Personen"), the entries are merged instead, since HA refuses two categories with one name.
 */
export function planCleanup({
  changes,
  categories,
  assignments,
}: PlanCleanupOptions): CleanupOperation[] {
  const operations: CleanupOperation[] = [];

  for (const scope of CATEGORY_SCOPES) {
    const idByName = new Map(
      categories[scope].map((category) => [category.name, category.categoryId]),
    );

    for (const { from, to } of changes) {
      const categoryId = idByName.get(from);

      if (!categoryId || from === to) continue;

      const targetCategoryId = idByName.get(to) ?? null;
      const entityIds = assignments[scope].get(categoryId) ?? [];

      operations.push({
        scope,
        kind: targetCategoryId ? "merge" : "rename",
        from,
        to,
        categoryId,
        targetCategoryId,
        entityIds,
      });
      idByName.delete(from);

      if (!targetCategoryId) idByName.set(to, categoryId);
    }
  }

  return operations;
}
