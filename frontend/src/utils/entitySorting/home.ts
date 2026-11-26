import type {
  SortingArea,
  SortingContext,
  SortingDevice,
  SortingEntity,
  SortingFlow,
  SortingRole,
} from "@/types/entitySorting";
import { lastLevel } from "@/utils/categoryPath";

import { ROLE_WEIGHT } from "./constants";
import { wordKey } from "./words";

/** One use of an entity by a sorted flow, with its weight already damped by the flow's size. */
export type FlowUse = { flow: SortingFlow; role: SortingRole; weight: number };

/** The context with the lookups the engine needs, built once per load. */
export type SortingHome = {
  context: SortingContext;
  entities: Map<string, SortingEntity>;
  devices: Map<string, SortingDevice>;
  areas: Map<string, SortingArea>;
  floorNames: Map<string, string>;
  /** Uses by flows that have a folder, per entity. */
  usesOf: Map<string, FlowUse[]>;
};

export function buildSortingHome(context: SortingContext): SortingHome {
  const usesOf = new Map<string, FlowUse[]>();

  for (const flow of context.flows) {
    if (!flow.categoryPath) continue;

    // A flow that switches 40 lights ("Alles aus") says little about each of them.
    const damping = 1 / Math.sqrt(Math.max(1, flow.uses.length));

    for (const use of flow.uses) {
      const role = strongestRole(use.roles);
      const weight = ROLE_WEIGHT[role] * damping;

      if (weight <= 0) continue;
      usesOf.set(use.entityId, [...(usesOf.get(use.entityId) ?? []), { flow, role, weight }]);
    }
  }

  return {
    context,
    entities: new Map(context.entities.map((entity) => [entity.entityId, entity])),
    devices: new Map(context.devices.map((device) => [device.deviceId, device])),
    areas: new Map(context.areas.map((area) => [area.areaId, area])),
    floorNames: new Map(context.floors.map((floor) => [floor.floorId, floor.name])),
    usesOf,
  };
}

function strongestRole(roles: SortingRole[]): SortingRole {
  return [...roles].sort((first, second) => ROLE_WEIGHT[second] - ROLE_WEIGHT[first])[0] ?? "value";
}

/** Every folder that exists, including the parents of nested ones. */
export function existingFolders(paths: Iterable<string>): Set<string> {
  const folders = new Set<string>();

  for (const path of paths) {
    const levels = path.split("/");
    levels.forEach((_, index) => folders.add(levels.slice(0, index + 1).join("/")));
  }

  return folders;
}

/**
 * The parent most folders named like an area sit in, e.g. "Haus" for "Haus/Küche" and "Haus/Bad";
 * empty when there is no such pattern. New area folders follow it.
 */
export function areaFolderPattern(home: SortingHome, folders: Set<string>): string {
  const areaKeys = new Set([...home.areas.values()].map((area) => wordKey(area.name)));
  const parents = new Map<string, number>();

  for (const path of folders) {
    const levels = path.split("/");
    if (levels.length < 2 || !areaKeys.has(wordKey(lastLevel(path)))) continue;

    const parent = levels.slice(0, -1).join("/");
    parents.set(parent, (parents.get(parent) ?? 0) + 1);
  }

  let best = "";
  let bestCount = 0;
  parents.forEach((count, parent) => {
    if (count > bestCount) [best, bestCount] = [parent, count];
  });

  return best;
}

export type AreaFolder = { path: string; exists: boolean };

/** The folder of an area: an existing one with its name (the shallowest), else one after the pattern. */
export function areaFolder(area: SortingArea, folders: Set<string>, pattern: string): AreaFolder {
  const key = wordKey(area.name);
  const existing = [...folders]
    .filter((path) => wordKey(lastLevel(path)) === key)
    .sort((first, second) => first.split("/").length - second.split("/").length)[0];

  if (existing) return { path: existing, exists: true };

  return { path: pattern ? `${pattern}/${area.name}` : area.name, exists: false };
}
