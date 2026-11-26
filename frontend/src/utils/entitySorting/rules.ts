import type { SortingCondition, SortingEntity, SortingRule } from "@/types/entitySorting";
import { cleanFolderPath } from "@/utils/categoryPath";

import { RULE_PLACEHOLDER } from "./constants";
import type { SortingHome } from "./home";

/** The rule that decides for an entity, and whether another one wanted something else. */
export type RuleHit = { ruleNumber: number; target: string; isConflict: boolean };

function conditionMatches(
  condition: SortingCondition,
  entity: SortingEntity,
  home: SortingHome,
): boolean {
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

export function ruleMatches(rule: SortingRule, entity: SortingEntity, home: SortingHome): boolean {
  return (
    rule.conditions.length > 0 &&
    rule.conditions.every((condition) => conditionMatches(condition, entity, home))
  );
}

/**
 * The rule's folder for this entity, with `{area}` and `{floor}` filled in; null when a placeholder
 * has nothing to fill (no area), so the rule leaves the entity alone.
 */
export function ruleTarget(
  rule: SortingRule,
  entity: SortingEntity,
  home: SortingHome,
): string | null {
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

/**
 * Which rule decides: the more specific one (more conditions), else the one higher up.
 * Rules are the user's will, so they beat every other hint.
 */
export function ruleFor(
  entity: SortingEntity,
  rules: SortingRule[],
  home: SortingHome,
): RuleHit | null {
  const hits = rules
    .map((rule, index) => ({ rule, index }))
    .filter(({ rule }) => ruleMatches(rule, entity, home))
    .map(({ rule, index }) => ({
      index,
      target: ruleTarget(rule, entity, home),
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

/**
 * Why a rule may catch fewer than expected: it matches automations, scripts, scenes or helpers (the
 * tool does not sort them yet), or entities that have a folder (only with "umsortieren").
 */
export function ruleSideHits(
  rule: SortingRule,
  home: SortingHome,
  isResortingSorted: boolean,
): RuleSideHits {
  const entries = home.context.entries.filter((entry) =>
    ruleMatches(
      rule,
      {
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
    ),
  ).length;
  const sorted = isResortingSorted
    ? 0
    : home.context.entities.filter(
        (entity) => entity.isInRegistry && entity.categoryPath && ruleMatches(rule, entity, home),
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

/** For the rule list: what a rule catches among `entities` ("passt auf 23"). */
export function ruleStats(
  rule: SortingRule,
  ruleIndex: number | null,
  rules: SortingRule[],
  entities: SortingEntity[],
  home: SortingHome,
): RuleStats {
  const stats: RuleStats = { matches: 0, withoutArea: 0, lost: 0 };

  for (const entity of entities) {
    if (!ruleMatches(rule, entity, home)) continue;
    if (!ruleTarget(rule, entity, home)) {
      stats.withoutArea++;
      continue;
    }

    stats.matches++;
    if (ruleIndex !== null && ruleFor(entity, rules, home)?.ruleNumber !== ruleIndex + 1)
      stats.lost++;
  }

  return stats;
}
