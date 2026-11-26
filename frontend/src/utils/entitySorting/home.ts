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

/** A folder only scenes live in ("Z2MQTT/Szenen/Küche"): no model for where devices go. */
export function isSceneOnly(path: string, home: SortingHome): boolean {
  const kinds = home.context.folderKinds[path];

  return !!kinds && kinds.length > 0 && kinds.every((kind) => kind === "scene");
}

/** A place where area folders live, and how many there are: "" is the top level. */
export type AreaParent = { parent: string; count: number };

/**
 * Where folders named like an area sit today, most first: "Haus" for "Haus/Küche" and "Haus/Bad",
 * "" when they lie at the top. Folders with scenes only do not count.
 */
export function areaParents(home: SortingHome, folders: Set<string>): AreaParent[] {
  const areaKeys = new Set([...home.areas.values()].map((area) => wordKey(area.name)));
  const counts = new Map<string, number>();

  for (const path of folders) {
    if (!areaKeys.has(wordKey(lastLevel(path))) || isSceneOnly(path, home)) continue;

    const parent = path.split("/").slice(0, -1).join("/");
    counts.set(parent, (counts.get(parent) ?? 0) + 1);
  }

  return [...counts.entries()]
    .map(([parent, count]) => ({ parent, count }))
    .sort(
      (first, second) => second.count - first.count || first.parent.localeCompare(second.parent),
    );
}

export type AreaFolder = { path: string; exists: boolean };

/**
 * The folder of an area: the one under `parent` if it exists, else an existing one with its name
 * (the shallowest, not a scenes-only one), else a new one under `parent` ("" = top level).
 */
export function areaFolder(input: {
  area: SortingArea;
  folders: Set<string>;
  parent: string;
  home: SortingHome;
}): AreaFolder {
  const { area, folders, parent, home } = input;
  const preferred = parent ? `${parent}/${area.name}` : area.name;
  const key = wordKey(area.name);

  if (folders.has(preferred)) return { path: preferred, exists: true };

  const existing = [...folders]
    .filter((path) => wordKey(lastLevel(path)) === key && !isSceneOnly(path, home))
    .sort((first, second) => first.split("/").length - second.split("/").length)[0];

  return existing ? { path: existing, exists: true } : { path: preferred, exists: false };
}
