import {
  EVERYWHERE_MAX_SHARE,
  EVERYWHERE_TOP_FOLDERS,
  AREA_WEIGHT,
  SYSTEM_DOMAINS,
} from "./constants";
import { areaFolder, type SortingHome } from "./home";
import { learnedVotes, type LearnIndex } from "./learning";
import type { SortingBundle, SortingNames, SortingState, Suggestion } from "./model";
import { ruleFor } from "./rules";
import { decide, FolderVotes } from "./votes";

/** What every suggestion of one computation shares. */
export type SuggestContext = {
  home: SortingHome;
  state: SortingState;
  names: SortingNames;
  folders: Set<string>;
  areaParent: string;
  learn: LearnIndex;
};

const NOTHING: Omit<Suggestion, "isUsedEverywhere"> = {
  target: null,
  confidence: "unclear",
  reasons: [],
  hintKinds: [],
  alternatives: [],
  isNew: false,
  ruleNumber: null,
};

export type SystemFolderOptions = {
  bundle: SortingBundle;
  context: SuggestContext;
};

/** "System/Sonne", "System/Zonen", "System/Backup" … in the UI language. */
export function systemFolder({ bundle, context }: SystemFolderOptions): string {
  const { names, home } = context;
  const integration = bundle.integration ?? "";
  const kind =
    SYSTEM_DOMAINS.has(bundle.main.domain) && !bundle.device ? bundle.main.domain : integration;
  const name = names.systemKinds[kind] ?? home.context.integrations[integration] ?? bundle.name;

  return `${names.system}/${name}`;
}

export type SuggestOptions = {
  bundle: SortingBundle;
  context: SuggestContext;
};

/**
 * The proposal for one bundle: a rule decides alone, otherwise area, flows and learned words vote.
 */
export function suggest({ bundle, context }: SuggestOptions): Suggestion {
  const { home, state, folders } = context;
  const isNew = (path: string): boolean => !folders.has(path);
  const rule = ruleFor({ entity: bundle.main, rules: state.rules, home });

  if (rule) {
    return {
      ...NOTHING,
      target: rule.target,
      confidence: "rule",
      reasons: [{ kind: "rule", ruleNumber: rule.ruleNumber, isConflict: rule.isConflict }],
      hintKinds: ["rule"],
      isNew: isNew(rule.target),
      isUsedEverywhere: false,
      ruleNumber: rule.ruleNumber,
    };
  }

  if (bundle.isSystem) {
    const target = systemFolder({ bundle, context });

    return {
      ...NOTHING,
      target,
      confidence: "likely",
      reasons: [{ kind: "system" }],
      hintKinds: ["system"],
      isNew: isNew(target),
      isUsedEverywhere: false,
    };
  }

  const votes = new FolderVotes(state.rejected.get(bundle.key));
  const area = bundle.areaId ? home.areas.get(bundle.areaId) : undefined;

  if (area) {
    const folder = areaFolder({ area, folders, parent: context.areaParent, home });
    const pattern = folder.exists ? null : context.areaParent || null;
    votes.add({
      folder: folder.path,
      weight: AREA_WEIGHT,
      reason: { kind: "area", areaName: area.name, pattern },
      hint: "area",
    });
  }

  const isUsedEverywhere = addFlowVotes({ bundle, home, votes });

  for (const vote of learnedVotes({ bundle, index: context.learn })) {
    votes.add({
      folder: vote.folder,
      weight: vote.weight,
      reason: { kind: "similar", count: vote.count, word: vote.word },
      hint: "similar",
    });
  }

  const decision = decide(votes);

  if (!decision) {
    return {
      ...NOTHING,
      reasons: isUsedEverywhere ? [{ kind: "everywhere" }] : [],
      isUsedEverywhere,
    };
  }

  // A folder that does not exist yet guesses the user's structure: likely at most, never sure.
  const isTargetNew = isNew(decision.target);
  const confidence = isTargetNew && decision.confidence === "sure" ? "likely" : decision.confidence;

  return {
    ...decision,
    confidence,
    reasons: isUsedEverywhere ? [...decision.reasons, { kind: "everywhere" }] : decision.reasons,
    isNew: isTargetNew,
    isUsedEverywhere,
    ruleNumber: null,
  };
}

/**
 * Each sorted flow that uses an entity votes for its own folder. An entity used by flows in many
 * top folders without a majority ("Jemand zuhause") does not vote at all.
 *
 * @returns Whether some entity of the bundle is used everywhere.
 */
function addFlowVotes({
  bundle,
  home,
  votes,
}: {
  bundle: SortingBundle;
  home: SortingHome;
  votes: FolderVotes;
}): boolean {
  let isUsedEverywhere = false;

  for (const entity of bundle.entities) {
    const uses = home.usesOf.get(entity.entityId) ?? [];
    if (!uses.length) continue;

    const byTop = new Map<string, number>();
    uses.forEach((use) => {
      const top = (use.flow.categoryPath ?? "").split("/")[0] ?? "";
      byTop.set(top, (byTop.get(top) ?? 0) + use.weight);
    });
    const total = [...byTop.values()].reduce((sum, weight) => sum + weight, 0);
    const largest = Math.max(...byTop.values());

    if (byTop.size >= EVERYWHERE_TOP_FOLDERS && largest / total < EVERYWHERE_MAX_SHARE) {
      isUsedEverywhere = true;
      continue;
    }

    for (const use of uses) {
      votes.add({
        folder: use.flow.categoryPath ?? "",
        weight: use.weight,
        reason: { kind: "flow", role: use.role, flowName: use.flow.name },
        hint: "flow",
      });
    }
  }

  return isUsedEverywhere;
}
