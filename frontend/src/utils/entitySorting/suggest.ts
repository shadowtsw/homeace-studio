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
  areaPattern: string;
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

/** "System/Sonne", "System/Zonen", "System/Backup" … in the UI language. */
export function systemFolder(bundle: SortingBundle, context: SuggestContext): string {
  const { names, home } = context;
  const integration = bundle.integration ?? "";
  const kind =
    SYSTEM_DOMAINS.has(bundle.main.domain) && !bundle.device ? bundle.main.domain : integration;
  const name = names.systemKinds[kind] ?? home.context.integrations[integration] ?? bundle.name;

  return `${names.system}/${name}`;
}

/** The proposal for one bundle: a rule decides alone, otherwise area, flows and learned words vote. */
export function suggest(bundle: SortingBundle, context: SuggestContext): Suggestion {
  const { home, state, folders } = context;
  const isNew = (path: string): boolean => !folders.has(path);
  const rule = ruleFor(bundle.main, state.rules, home);

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
    const target = systemFolder(bundle, context);

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
    const folder = areaFolder(area, folders, context.areaPattern);
    const pattern = folder.exists ? null : context.areaPattern || null;
    votes.add(folder.path, AREA_WEIGHT, { kind: "area", areaName: area.name, pattern }, "area");
  }

  const isUsedEverywhere = addFlowVotes(bundle, home, votes);

  for (const vote of learnedVotes(bundle, context.learn)) {
    votes.add(
      vote.folder,
      vote.weight,
      { kind: "similar", count: vote.count, word: vote.word },
      "similar",
    );
  }

  const decision = decide(votes);

  if (!decision) {
    return {
      ...NOTHING,
      reasons: isUsedEverywhere ? [{ kind: "everywhere" }] : [],
      isUsedEverywhere,
    };
  }

  return {
    ...decision,
    reasons: isUsedEverywhere ? [...decision.reasons, { kind: "everywhere" }] : decision.reasons,
    isNew: isNew(decision.target),
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
function addFlowVotes(bundle: SortingBundle, home: SortingHome, votes: FolderVotes): boolean {
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
      votes.add(
        use.flow.categoryPath ?? "",
        use.weight,
        { kind: "flow", role: use.role, flowName: use.flow.name },
        "flow",
      );
    }
  }

  return isUsedEverywhere;
}
