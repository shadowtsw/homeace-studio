import { apiFetch, apiPost } from "./api";

/** HA's category scopes; all helpers share "helpers", plain entities use HomeAce Studio's own. */
export type CategoryScope = "automation" | "script" | "scene" | "helpers" | "homeace_entities";

/** Entries per scope in one category name. */
export type ScopeCounts = Partial<Record<CategoryScope, number>>;

export type SplitProposal = {
  key: string;
  kind: "split";
  from: string;
  to: string;
  /** Spaced dash; an unspaced one may belong to the name ("Klima-Sensoren"). */
  isCertain: boolean;
  counts: ScopeCounts;
};

export type MergeProposal = {
  key: string;
  kind: "merge";
  names: string[];
  to: string;
  counts: Record<string, ScopeCounts>;
};

export type CleanupProposal = SplitProposal | MergeProposal;

export type CleanupOverview = { proposals: CleanupProposal[]; ignoredCount: number };

/** One confirmed change: the category name `from` gets the folder path `to`. */
export type CleanupChange = { from: string; to: string };

/** One step HA will do, per scope. */
export type CleanupStep = {
  scope: CategoryScope;
  kind: "rename" | "merge";
  from: string;
  to: string;
  entryCount: number;
};

export function fetchCleanup(): Promise<CleanupOverview> {
  return apiFetch<CleanupOverview>("/categories/cleanup");
}

export async function previewCleanup(changes: CleanupChange[]): Promise<CleanupStep[]> {
  const result = await apiPost<{ steps: CleanupStep[] }>("/categories/cleanup/preview", {
    changes,
  });

  return result.steps;
}

/** @returns How many category names were converted. */
export async function applyCleanup(changes: CleanupChange[]): Promise<number> {
  const result = await apiPost<{ categoryCount: number }>("/categories/cleanup/apply", {
    changes,
  });

  return result.categoryCount;
}

export async function ignoreProposal(key: string): Promise<void> {
  await apiPost<null>("/categories/cleanup/ignore", { key });
}

export async function restoreProposals(): Promise<void> {
  await apiFetch<null>("/categories/cleanup/ignore", { method: "DELETE" });
}
