import type { SortingEntity } from "@/types/entitySorting";
import { cleanFolderPath } from "@/utils/categories/categoryPath";

import { buildBundles } from "./bundles";
import { areaParents, existingFolders, type SortingHome } from "./home";
import { buildLearnIndex } from "./learning";
import type {
  PlannedMove,
  SortingBundle,
  SortingComputation,
  SortingLayout,
  SortingNames,
  SortingState,
  SuggestionChange,
} from "./model";
import { confidenceRank } from "./layout";
import { ruleFor } from "./rules";
import { suggest } from "./suggest";
import { effectiveTarget } from "./targets";

export type SortingInput = {
  home: SortingHome;
  state: SortingState;
  names: SortingNames;
  /** The computation and layout shown now: ticked bundles teach with the folder they show. */
  previous: SortingComputation | null;
  layout: SortingLayout | null;
};

export type TargetOfOptions = {
  bundle: SortingBundle;
  input: Omit<SortingInput, "home" | "names">;
};

/** The folder a bundle goes to now, from the shown computation and layout. */
export function targetOf({ bundle, input }: TargetOfOptions): string | null {
  return effectiveTarget({
    choice: input.state.choices.get(bundle.key),
    suggestion: input.previous?.suggestions.get(bundle.key),
    group: input.layout?.groupOf.get(bundle.key),
    groupNames: input.state.groupNames,
  });
}

/**
 * Bundles and a proposal for each. Runs on every tick, so it stays a pure function over prepared
 * lookups; ticked bundles count as sorted right away, which makes the next proposals better.
 */
export function computeSorting(input: SortingInput): SortingComputation {
  const { home, state, names } = input;
  const bundles = buildBundles({ home, state });
  const folders = existingFolders(home.context.folders);
  const areaParent = state.areaParent ?? areaParents({ home, folders })[0]?.parent ?? "";
  const ticked = new Map<
    string,
    { folder: string; isCorrection: boolean; bundle: SortingBundle }
  >();

  bundles.forEach((bundle) => {
    const choice = state.choices.get(bundle.key);
    const folder = choice?.isOn ? targetOf({ bundle, input }) : null;

    if (folder) ticked.set(bundle.key, { folder, isCorrection: !!choice?.target, bundle });
  });

  const context = {
    home,
    state,
    names,
    folders,
    areaParent,
    learn: buildLearnIndex({ home, ticked }),
  };
  const suggestions = new Map(
    [...bundles.values()].map((bundle) => [bundle.key, suggest({ bundle, context })]),
  );

  return { bundles, suggestions, folders, areaParent };
}

export type EntityTargetOptions = {
  entity: SortingEntity;
  bundle: SortingBundle;
  input: Pick<SortingInput, "home" | "state">;
};

/**
 * Where one entity of a bundle goes when it should not follow its device: a rule for that entity
 * ("Firmware → Technik/Updates"), or the folder for technical entities when they go separately.
 */
export function entityTarget({
  entity,
  bundle,
  input,
}: EntityTargetOptions): { target: string; ruleNumber: number | null } | null {
  const { home, state } = input;
  const rule = ruleFor({ entity, rules: state.rules, home });

  if (rule && entity !== bundle.main) return { target: rule.target, ruleNumber: rule.ruleNumber };
  if (
    state.options.isTechnicalSeparate &&
    entity.entityCategory &&
    !(rule && entity === bundle.main)
  ) {
    const folder = cleanFolderPath(state.options.technicalFolder);
    return folder ? { target: folder, ruleNumber: null } : null;
  }

  return null;
}

/** Every entity move of the ticked bundles, without the entities unticked inside a bundle. */
export function collectMoves(input: {
  home: SortingHome;
  state: SortingState;
  computation: SortingComputation;
  layout: SortingLayout;
}): PlannedMove[] {
  const { state, computation, layout } = input;
  const moves: PlannedMove[] = [];
  const shown = { state, previous: computation, layout };

  computation.bundles.forEach((bundle) => {
    if (!state.choices.get(bundle.key)?.isOn) return;

    const target = targetOf({ bundle, input: shown });
    if (!target) return;

    for (const entity of bundle.entities) {
      if (state.excluded.has(entity.entityId)) continue;

      const own = entityTarget({ entity, bundle, input });
      moves.push({ entityId: entity.entityId, categoryPath: own?.target ?? target });
    }
  });

  return moves;
}

export type SuggestionChangesOptions = {
  before: SortingComputation;
  after: SortingComputation;
  actedOn: string | null;
};

/**
 * What changed between two computations, for the "sicherer geworden" hint. The bundle the user just
 * acted on is left out: its own change is no news.
 */
export function suggestionChanges({
  before,
  after,
  actedOn,
}: SuggestionChangesOptions): Map<string, SuggestionChange> {
  const changes = new Map<string, SuggestionChange>();

  after.suggestions.forEach((next, key) => {
    const previous = before.suggestions.get(key);
    if (!previous || key === actedOn) return;

    if (next.confidence !== "unclear" && next.target && next.target !== previous.target) {
      changes.set(key, "newTarget");
    } else if (confidenceRank(next.confidence) > confidenceRank(previous.confidence)) {
      changes.set(key, "surer");
    } else if (confidenceRank(next.confidence) < confidenceRank(previous.confidence)) {
      changes.set(key, "lessSure");
    }
  });

  return changes;
}
