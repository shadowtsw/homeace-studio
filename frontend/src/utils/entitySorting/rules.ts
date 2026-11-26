import type { SortingCondition, SortingEntity, SortingRule } from "@/types/entitySorting";
import { cleanFolderPath } from "@/utils/categories/categoryPath";

import { RULE_PLACEHOLDER } from "./constants";
import type { SortingHome } from "./home";

/** The rule that decides for an entity, and whether another one wanted something else. */
export type RuleHit = { ruleNumber: number; target: string; isConflict: boolean };

function conditionMatches({
  condition,
  entity,
  home,
}: {
  condition: SortingCondition;
  entity: SortingEntity;
  home: SortingHome;
}): boolean {
  const device = entity.deviceId ? home.devices.get(entity.deviceId) : undefined;
  const area = entity.areaId ? home.areas.get(entity.areaId) : undefined;

  switch (condition.type) {
    case "label":
      return entity.labels.includes(condition.value);
    case "area":
      return entity.areaId === condition.value;
    case "floor":
      return !!area && area.floorId === condition.value;
    case "manufacturer":
      return device?.manufacturer === condition.value;
    case "integration":
      return entity.integration === condition.value;
    case "domain":
      return entity.domain === condition.value;
    case "deviceClass":
      return entity.deviceClass === condition.value;
    case "nameContains":
      return !!condition.value && entity.name.toLowerCase().includes(condition.value.toLowerCase());
  }
}

export type RuleMatchesOptions = {
  rule: SortingRule;
  entity: SortingEntity;
  home: SortingHome;
};

export function ruleMatches({ rule, entity, home }: RuleMatchesOptions): boolean {
  return (
    rule.conditions.length > 0 &&
    rule.conditions.every((condition) => conditionMatches({ condition, entity, home }))
  );
}

export type RuleTargetOptions = {
  rule: SortingRule;
  entity: SortingEntity;
  home: SortingHome;
};

/**
 * The rule's folder for this entity, with `{area}` and `{floor}` filled in; null when a placeholder
 * has nothing to fill (no area), so the rule leaves the entity alone.
 */
export function ruleTarget({ rule, entity, home }: RuleTargetOptions): string | null {
  const area = entity.areaId ? home.areas.get(entity.areaId) : undefined;
  const floorName = area?.floorId ? home.floorNames.get(area.floorId) : undefined;
  const needsArea = rule.target.includes(RULE_PLACEHOLDER.area);
  const needsFloor = rule.target.includes(RULE_PLACEHOLDER.floor);

  if ((needsArea && !area) || (needsFloor && !floorName)) return null;

  const filled = rule.target
    .split(RULE_PLACEHOLDER.area)
    .join(area?.name ?? "")
    .split(RULE_PLACEHOLDER.floor)
    .join(floorName ?? "");

  return cleanFolderPath(filled) || null;
}

export type RuleForOptions = {
  entity: SortingEntity;
  rules: SortingRule[];
  home: SortingHome;
};

/**
 * Which rule decides: the more specific one (more conditions), else the one higher up.
 * Rules are the user's will, so they beat every other hint.
 */
export function ruleFor({ entity, rules, home }: RuleForOptions): RuleHit | null {
  const hits = rules
    .map((rule, index) => ({ rule, index }))
    .filter(({ rule }) => ruleMatches({ rule, entity, home }))
    .map(({ rule, index }) => ({
      index,
      target: ruleTarget({ rule, entity, home }),
      conditions: rule.conditions.length,
    }))
    .filter(
      (hit): hit is { index: number; target: string; conditions: number } => hit.target !== null,
    )
    .sort((first, second) => second.conditions - first.conditions || first.index - second.index);
  const winner = hits[0];

  if (!winner) return null;

  return {
    ruleNumber: winner.index + 1,
    target: winner.target,
    isConflict: hits.some((hit) => hit.target !== winner.target),
  };
}

/** What a rule matches beyond the offered entities: entries, and entities sorted already. */
export type RuleSideHits = { entries: number; sorted: number };

export type RuleSideHitsOptions = {
  rule: SortingRule;
  home: SortingHome;
  isResortingSorted: boolean;
};

/**
 * Why a rule may catch fewer than expected: it matches automations, scripts, scenes or helpers (the
 * tool does not sort them yet), or entities that have a folder (only with "umsortieren").
 */
export function ruleSideHits({ rule, home, isResortingSorted }: RuleSideHitsOptions): RuleSideHits {
  const entries = home.context.entries.filter((entry) =>
    ruleMatches({
      rule,
      entity: {
        entityId: entry.entityId,
        name: entry.name,
        domain: entry.entityId.split(".")[0] ?? "",
        deviceId: null,
        areaId: entry.areaId,
        deviceClass: null,
        entityCategory: null,
        integration: null,
        labels: entry.labels,
        categoryPath: entry.categoryPath,
        isDisabled: false,
        isHidden: false,
        isInRegistry: true,
      },
      home,
    }),
  ).length;
  const sorted = isResortingSorted
    ? 0
    : home.context.entities.filter(
        (entity) =>
          entity.isInRegistry && entity.categoryPath && ruleMatches({ rule, entity, home }),
      ).length;

  return { entries, sorted };
}

export type RuleStats = {
  matches: number;
  /** Matched, but the target needs an area (or floor) the entity lacks. */
  withoutArea: number;
  /** Matched, but another rule decides. */
  lost: number;
};

export type RuleStatsOptions = {
  rule: SortingRule;
  ruleIndex: number | null;
  rules: SortingRule[];
  entities: SortingEntity[];
  home: SortingHome;
};

/** For the rule list: what a rule catches among `entities` ("passt auf 23"). */
export function ruleStats({ rule, ruleIndex, rules, entities, home }: RuleStatsOptions): RuleStats {
  const stats: RuleStats = { matches: 0, withoutArea: 0, lost: 0 };

  for (const entity of entities) {
    if (!ruleMatches({ rule, entity, home })) continue;
    if (!ruleTarget({ rule, entity, home })) {
      stats.withoutArea++;
      continue;
    }

    stats.matches++;
    if (ruleIndex !== null && ruleFor({ entity, rules, home })?.ruleNumber !== ruleIndex + 1)
      stats.lost++;
  }

  return stats;
}

export type RuleScopeOptions = {
  entities: SortingEntity[];
  /** "Auch einsortierte neu einsortieren": entities with a folder count too. */
  isResortingSorted: boolean;
  /** Disabled and hidden entities count too. */
  includeHidden: boolean;
};

/** Entities the rules may touch: as offered in step 3, plus sorted ones when re-sorting is on. */
export function ruleScope({
  entities,
  isResortingSorted,
  includeHidden,
}: RuleScopeOptions): SortingEntity[] {
  return entities.filter((entity) => {
    const isOffered = isResortingSorted || !entity.categoryPath;
    const isShown = includeHidden || !(entity.isDisabled || entity.isHidden);

    return entity.isInRegistry && isOffered && isShown;
  });
}

export type RulePreview = RuleStats &
  RuleSideHits & {
    /** A few matched entities with the folder each would go to. */
    examples: { name: string; target: string }[];
  };

export type RulePreviewOptions = {
  rule: SortingRule;
  rules: SortingRule[];
  /** The entities the rule may touch (`ruleScope`). */
  scope: SortingEntity[];
  home: SortingHome;
  isResortingSorted: boolean;
  maxExamples: number;
};

/**
 * What a rule being written would do: how many entities it catches, a few examples, and what
 * matches besides (entries, sorted entities).
 */
export function rulePreview({
  rule,
  rules,
  scope,
  home,
  isResortingSorted,
  maxExamples,
}: RulePreviewOptions): RulePreview {
  // How many it catches, and how many of them lack the area the folder needs
  const stats = ruleStats({ rule, ruleIndex: null, rules, entities: scope, home });

  // A few examples with their folder
  const examples = scope
    .filter((entity) => ruleMatches({ rule, entity, home }) && ruleTarget({ rule, entity, home }))
    .slice(0, maxExamples)
    .map((entity) => ({ name: entity.name, target: ruleTarget({ rule, entity, home }) ?? "" }));

  // What matches besides
  const sideHits = ruleSideHits({ rule, home, isResortingSorted });

  return { ...stats, ...sideHits, examples };
}

export type RuleCoverageOptions = {
  /** The entities the rules may touch (`ruleScope`). */
  entities: SortingEntity[];
  rules: SortingRule[];
  home: SortingHome;
};

/** How many entities some rule decides, and for how many of them two rules disagree. */
export function ruleCoverage({ entities, rules, home }: RuleCoverageOptions): {
  covered: number;
  conflicts: number;
} {
  let covered = 0;
  let conflicts = 0;

  for (const entity of entities) {
    const hit = ruleFor({ entity, rules, home });
    if (!hit) continue;

    covered++;
    if (hit.isConflict) conflicts++;
  }

  return { covered, conflicts };
}
