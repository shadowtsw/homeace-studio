import type { SortingEntity } from "@/types/entitySorting";

import {
  DOMAIN_ORDER,
  ENTITY_BUNDLE_PREFIX,
  SYSTEM_DOMAINS,
  SYSTEM_INTEGRATIONS,
} from "./constants";
import type { SortingHome } from "./home";
import type { SortingBundle, SortingState } from "./model";
import { ruleFor } from "./rules";
import { meaningfulWords } from "./words";

export function bundleKeyOf(entity: SortingEntity): string {
  return entity.deviceId ?? `${ENTITY_BUNDLE_PREFIX}${entity.entityId}`;
}

/**
 * Whether the tool offers the entity at all. Not offered: YAML ones (cannot get a folder), kept out
 * on purpose, disabled or hidden ones unless asked for, and sorted ones unless a rule re-sorts them.
 */
export function isOffered(entity: SortingEntity, state: SortingState, home: SortingHome): boolean {
  if (!entity.isInRegistry || state.ignored.has(bundleKeyOf(entity))) return false;

  if (entity.categoryPath) {
    if (!state.options.isResortingSorted) return false;

    const hit = ruleFor(entity, state.rules, home);
    return !!hit && hit.target !== entity.categoryPath;
  }

  return state.options.includeHidden || !(entity.isDisabled || entity.isHidden);
}

function domainRank(domain: string): number {
  const index = DOMAIN_ORDER.indexOf(domain);

  return index < 0 ? DOMAIN_ORDER.length : index;
}

/** The entity a device is about: no technical one, and lights before switches before sensors. */
export function mainEntity(entities: SortingEntity[]): SortingEntity {
  const sorted = [...entities].sort(
    (first, second) =>
      Number(!!first.entityCategory) - Number(!!second.entityCategory) ||
      domainRank(first.domain) - domainRank(second.domain),
  );

  return sorted[0] as SortingEntity;
}

function isSystemEntity(entity: SortingEntity): boolean {
  return SYSTEM_DOMAINS.has(entity.domain) || SYSTEM_INTEGRATIONS.has(entity.integration ?? "");
}

/** The offered entities, one bundle per device: 1500 entities become a few hundred decisions. */
export function buildBundles(home: SortingHome, state: SortingState): Map<string, SortingBundle> {
  const grouped = new Map<string, SortingEntity[]>();

  for (const entity of home.context.entities) {
    if (!isOffered(entity, state, home)) continue;

    const key = bundleKeyOf(entity);
    grouped.set(key, [...(grouped.get(key) ?? []), entity]);
  }

  const bundles = new Map<string, SortingBundle>();

  grouped.forEach((entities, key) => {
    const first = entities[0] as SortingEntity;
    const device = first.deviceId ? (home.devices.get(first.deviceId) ?? null) : null;
    const main = mainEntity(entities);
    const name = device?.name ?? first.name;

    bundles.set(key, {
      key,
      name,
      device,
      entities,
      main,
      areaId: device ? device.areaId : first.areaId,
      integration: main.integration,
      isSystem: device ? device.isService : isSystemEntity(main),
      words: meaningfulWords(name),
    });
  });

  return bundles;
}
