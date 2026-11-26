import type { DependencyIndex } from "../dependencies/dependency-analysis";
import type { Entry } from "../entries/entry.model";
import { createDeviceContext } from "../ha/device-context";
import type { HaArea, HaDevice, HaEntityRegistryEntry, HaState } from "../ha/ha.types";

export const AREA_SOURCE = {
  /** The entry has the area itself (HA entity registry). */
  own: "own",
  /** A device or entity the entry uses is in that area. */
  uses: "uses",
  /** An automation or script that uses the entry is in that area (helpers mostly). */
  usedBy: "usedBy",
} as const;

export type AreaSource = (typeof AREA_SOURCE)[keyof typeof AREA_SOURCE];

/** One area an entry belongs to, and why. */
export type EntryAreaLink = {
  areaId: string;
  name: string;
  source: AreaSource;
  /** First thing that brought the area in: a device name or a flow name; null for `own`. */
  via: { entityId: string; name: string } | null;
};

export type EntryAreas = {
  entityId: string;
  /** Own area alone, else derived ones, most used first; empty when nothing points to an area. */
  areas: EntryAreaLink[];
};

export type EntryAreasInput = {
  entries: Entry[];
  states: HaState[];
  registry: HaEntityRegistryEntry[];
  devices: HaDevice[];
  areas: HaArea[];
  index: DependencyIndex;
};

type Candidate = { link: EntryAreaLink; count: number };

/**
 * Areas of every entry without any setup: its own area; else the areas of the devices and entities
 * its flow, scene or group uses; else the areas of the flows that use it (one step, not further).
 */
export function deriveEntryAreas(input: EntryAreasInput): EntryAreas[] {
  const areaNames = new Map(input.areas.map((area) => [area.area_id, area.name]));
  const devices = new Map(input.devices.map((device) => [device.id, device]));
  const deviceContext = createDeviceContext(input.devices);
  const registry = new Map(input.registry.map((entry) => [entry.entity_id, entry]));
  const friendlyNames = new Map(
    input.states.map((state) => [state.entity_id, state.attributes.friendly_name ?? null]),
  );

  const deviceOf = (entityId: string): HaDevice | undefined => {
    const deviceId = registry.get(entityId)?.device_id;
    return deviceId ? devices.get(deviceId) : undefined;
  };

  /** The entity's own area, else its device's, else the parent device's (like HA shows it). */
  const areaOf = (entityId: string): string | null => {
    const entry = registry.get(entityId);
    if (!entry) return null;
    const device = deviceOf(entityId);
    return entry.area_id ?? (device ? deviceContext.areaIdOf(device) : null);
  };

  /** "Terrace motion sensor" for an entity of a device, else the entity's own name. */
  const viaNameOf = (entityId: string): string => {
    const device = deviceOf(entityId);
    const deviceName = device ? deviceContext.nameOf(device) : null;
    return deviceName ?? friendlyNames.get(entityId) ?? entityId;
  };

  type AddOptions = {
    found: Map<string, Candidate>;
    areaId: string;
    source: AreaSource;
    via: EntryAreaLink["via"];
  };

  const add = ({ found, areaId, source, via }: AddOptions): void => {
    const name = areaNames.get(areaId);
    if (!name) return;
    const existing = found.get(areaId);
    if (existing) existing.count++;
    else found.set(areaId, { link: { areaId, name, source, via }, count: 1 });
  };

  const sorted = (found: Map<string, Candidate>): EntryAreaLink[] =>
    [...found.values()]
      .sort((a, b) => b.count - a.count || a.link.name.localeCompare(b.link.name))
      .map((candidate) => candidate.link);

  const entryNames = new Map(input.entries.map((entry) => [entry.entityId, entry.name]));

  // Step 1: own area, else what the entry uses.
  const direct = new Map<string, EntryAreaLink[]>();

  for (const entry of input.entries) {
    if (entry.area && areaNames.has(entry.area.areaId)) {
      direct.set(entry.entityId, [{ ...entry.area, source: AREA_SOURCE.own, via: null }]);
      continue;
    }

    const found = new Map<string, Candidate>();

    for (const usedId of input.index.get(entry.entityId)?.keys() ?? []) {
      const areaId = areaOf(usedId);
      if (areaId)
        add({
          found,
          areaId,
          source: AREA_SOURCE.uses,
          via: { entityId: usedId, name: viaNameOf(usedId) },
        });
    }

    direct.set(entry.entityId, sorted(found));
  }

  // Step 2: entries that still have none take the areas of the flows that use them.
  return input.entries.map((entry): EntryAreas => {
    const areas = direct.get(entry.entityId) ?? [];
    if (areas.length > 0) return { entityId: entry.entityId, areas };

    const found = new Map<string, Candidate>();

    for (const [userId, refs] of input.index) {
      if (userId === entry.entityId || !refs.has(entry.entityId)) continue;

      for (const link of direct.get(userId) ?? []) {
        add({
          found,
          areaId: link.areaId,
          source: AREA_SOURCE.usedBy,
          via: {
            entityId: userId,
            name: entryNames.get(userId) ?? friendlyNames.get(userId) ?? userId,
          },
        });
      }
    }

    return { entityId: entry.entityId, areas: sorted(found) };
  });
}
