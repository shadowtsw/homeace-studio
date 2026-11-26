import type { EntityOption } from "@/types/editor";

/** Criteria of the picker: one value each, combined with "and". */
export type PickerCriteria = {
  area: string | null;
  label: string | null;
  kind: string | null;
};

export const CRITERIA_KEYS = ["area", "label", "kind"] as const;
export type CriterionKey = (typeof CRITERIA_KEYS)[number];

/** Stands for "no area" among the area values. */
export const NO_AREA = "\u0000no-area";

export type CriterionOption = { value: string; count: number };

export type DeviceGroup = {
  deviceId: string | null;
  deviceName: string | null;
  entities: EntityOption[];
};

/** Lower case without umlauts, so "kueche" finds "Küche". */
export function fold(text: string): string {
  return text
    .toLowerCase()
    .replace(/ä/g, "ae")
    .replace(/ö/g, "oe")
    .replace(/ü/g, "ue")
    .replace(/ß/g, "ss");
}

function criterionValues(entity: EntityOption, key: CriterionKey): string[] {
  if (key === "area") return [entity.areaName ?? NO_AREA];
  if (key === "label") return entity.labels;
  return [entity.domain];
}

/** Every word must appear in name, device, area, labels, kind or entity ID; order does not matter. */
export function matchesQuery(
  entity: EntityOption,
  query: string,
  kindLabel: (domain: string) => string,
): boolean {
  const words = fold(query).split(/\s+/).filter(Boolean);
  const haystack = fold(
    [
      entity.name,
      entity.shortName,
      entity.deviceName ?? "",
      entity.areaName ?? "",
      entity.entityId,
      kindLabel(entity.domain),
      ...entity.labels,
    ].join(" "),
  );

  return words.every((word) => haystack.includes(word));
}

export function matchesCriteria(entity: EntityOption, criteria: PickerCriteria): boolean {
  return CRITERIA_KEYS.every((key) => {
    const wanted = criteria[key];
    return wanted === null || criterionValues(entity, key).includes(wanted);
  });
}

/** The values a criterion offers, with how many entities each has, sorted by name. */
export function criterionOptions(entities: EntityOption[], key: CriterionKey): CriterionOption[] {
  const counts = new Map<string, number>();

  for (const entity of entities) {
    for (const value of criterionValues(entity, key))
      counts.set(value, (counts.get(value) ?? 0) + 1);
  }

  return [...counts]
    .map(([value, count]) => ({ value, count }))
    .sort((a, b) =>
      a.value === NO_AREA ? 1 : b.value === NO_AREA ? -1 : a.value.localeCompare(b.value),
    );
}

/** What the flow already uses first, then what sits in the automation's own area. */
export function suggestEntities(
  entities: EntityOption[],
  usedIds: ReadonlySet<string>,
  areaId: string | null,
  limit = 5,
): EntityOption[] {
  const used = entities.filter((entity) => usedIds.has(entity.entityId));
  const inArea = areaId
    ? entities.filter((entity) => entity.areaId === areaId && !usedIds.has(entity.entityId))
    : [];

  return [...used, ...inArea].slice(0, limit);
}

/** Entities of one device together, in the order they come; entities without a device alone. */
export function groupByDevice(entities: EntityOption[]): DeviceGroup[] {
  const groups: DeviceGroup[] = [];
  const byDevice = new Map<string, DeviceGroup>();

  for (const entity of entities) {
    if (!entity.deviceId) {
      groups.push({ deviceId: null, deviceName: null, entities: [entity] });
      continue;
    }

    let group = byDevice.get(entity.deviceId);

    if (!group) {
      group = { deviceId: entity.deviceId, deviceName: entity.deviceName, entities: [] };
      byDevice.set(entity.deviceId, group);
      groups.push(group);
    }

    group.entities.push(entity);
  }

  return groups;
}

/** How many entities each device has in total, to tell single-function devices apart. */
export function countByDevice(entities: EntityOption[]): Map<string, number> {
  const counts = new Map<string, number>();

  for (const entity of entities) {
    if (entity.deviceId) counts.set(entity.deviceId, (counts.get(entity.deviceId) ?? 0) + 1);
  }

  return counts;
}

/**
 * The label of a row:
 * - inside a device card only the function ("Battery");
 * - a device with one entity by the device name ("Terrace light");
 * - elsewhere "Device: Function", or the plain name when it does not start with the device name.
 */
export function rowLabel(
  entity: EntityOption,
  where: "card" | "list",
  deviceEntityCounts: ReadonlyMap<string, number>,
): string {
  if (where === "card") return entity.shortName;
  if (!entity.deviceId || !entity.deviceName) return entity.name;
  if ((deviceEntityCounts.get(entity.deviceId) ?? 0) <= 1) return entity.deviceName;
  if (entity.shortName === entity.name) return entity.name;

  return `${entity.deviceName}: ${entity.shortName}`;
}
