import type { Entry } from "../entries/entry.model";
import type { HaArea, HaDevice, HaEntityRegistryEntry } from "../ha/ha.types";

/** Where a label hangs, before it is deleted: HA takes it away from all of these. */
export type LabelUsage = {
  /** Automations, scripts, scenes and helpers that carry it. */
  entries: number;
  /** Other entities (lights, sensors …) that carry it. */
  entities: number;
  devices: number;
  areas: number;
  /** Flows that use it as a target ("turn off everything labelled …"); they would do less. */
  flowsAsTarget: { entityId: string; name: string }[];
};

export type LabelUsageSources = {
  entries: readonly Entry[];
  registry: readonly HaEntityRegistryEntry[];
  devices: readonly HaDevice[];
  areas: readonly HaArea[];
  /** Config of every automation and script, by entity ID. */
  configs: ReadonlyMap<string, unknown>;
};

const LABEL_ID_KEY = "label_id";

/** Whether a config names the label anywhere as `label_id` (a string or a list of them). */
function namesLabel({ value, labelId }: { value: unknown; labelId: string }): boolean {
  if (Array.isArray(value)) return value.some((item) => namesLabel({ value: item, labelId }));
  if (!value || typeof value !== "object") return false;

  return Object.entries(value).some(([key, inner]) => {
    if (key === LABEL_ID_KEY) {
      const ids = Array.isArray(inner) ? inner : [inner];
      if (ids.includes(labelId)) return true;
    }
    return namesLabel({ value: inner, labelId });
  });
}

export type LabelUsageOptions = {
  labelId: string;
  sources: LabelUsageSources;
};

/** Everything a label is attached to or used by, counted from one snapshot of HA. */
export function labelUsage({ labelId, sources }: LabelUsageOptions): LabelUsage {
  // Entries count on their own; the remaining registry entries are plain entities
  const entryIds = new Set(sources.entries.map((entry) => entry.entityId));
  const entries = sources.entries.filter((entry) =>
    entry.labels.some((label) => label.labelId === labelId),
  ).length;
  const entities = sources.registry.filter(
    (entry) => !entryIds.has(entry.entity_id) && entry.labels.includes(labelId),
  ).length;

  // Devices and areas carry labels too
  const devices = sources.devices.filter((device) => device.labels?.includes(labelId)).length;
  const areas = sources.areas.filter((area) => area.labels?.includes(labelId)).length;

  // Flows that name it as a target
  const names = new Map(sources.entries.map((entry) => [entry.entityId, entry.name]));
  const flowsAsTarget = [...sources.configs.entries()]
    .filter(([, config]) => namesLabel({ value: config, labelId }))
    .map(([entityId]) => ({ entityId, name: names.get(entityId) ?? entityId }))
    .sort((first, second) => first.name.localeCompare(second.name));

  return { entries, entities, devices, areas, flowsAsTarget };
}
