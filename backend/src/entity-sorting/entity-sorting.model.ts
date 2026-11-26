import type { DependencyRole } from "../dependencies/dependency-analysis";
import type { EntryKind } from "../entries/entry.model";

/** What a rule condition looks at (docs/features/entity-sorting.md). */
export const SORTING_CONDITION_TYPE = {
  label: "label",
  area: "area",
  floor: "floor",
  manufacturer: "manufacturer",
  integration: "integration",
  domain: "domain",
  deviceClass: "deviceClass",
  nameContains: "nameContains",
} as const;

export type SortingConditionType =
  (typeof SORTING_CONDITION_TYPE)[keyof typeof SORTING_CONDITION_TYPE];

/** One condition of a rule; label, area and floor hold ids, the rest plain values. */
export type SortingCondition = { type: SortingConditionType; value: string };

/**
 * "Everything with label X goes to folder Y". All conditions must match (AND). The target may hold
 * the placeholders `{area}` and `{floor}`.
 */
export type SortingRule = { conditions: SortingCondition[]; target: string };

/** Folders the user turned down for one bundle (a device, or one entity without a device). */
export type SortingRejection = { bundleKey: string; paths: string[] };

/** One entity moved by the tool, with where it was before. */
export type SortingRunMove = { entityId: string; from: string | null; to: string | null };

/** The last apply of the tool; it can be undone until the next one. */
export type SortingRun = { runId: string; at: string; moves: SortingRunMove[] };

/** What the tool keeps between visits, for all HA users together (folders are shared too). */
export type EntitySortingMemory = {
  rules: SortingRule[];
  rejected: SortingRejection[];
  /** Bundle keys the user keeps without a folder on purpose. */
  ignored: string[];
  lastRun: SortingRun | null;
};

export const EMPTY_SORTING_MEMORY: EntitySortingMemory = {
  rules: [],
  rejected: [],
  ignored: [],
  lastRun: null,
};

/** Bundle key of an entity without a device; a device's bundle key is its device id. */
export const ENTITY_BUNDLE_PREFIX = "entity:";

/** A plain entity as the tool sees it; disabled ones included, entries left out. */
export type SortingEntity = {
  entityId: string;
  name: string;
  domain: string;
  deviceId: string | null;
  /** Its own area, else its device's (a child device's parent counts). */
  areaId: string | null;
  deviceClass: string | null;
  entityCategory: "config" | "diagnostic" | null;
  /** The integration's domain, e.g. "hue"; names are in {@link SortingContext.integrations}. */
  integration: string | null;
  /** Label names. */
  labels: string[];
  categoryPath: string | null;
  isDisabled: boolean;
  isHidden: boolean;
  /** False for YAML entities without unique_id; they cannot get a folder. */
  isInRegistry: boolean;
};

export type SortingDevice = {
  deviceId: string;
  name: string;
  areaId: string | null;
  manufacturer: string | null;
  model: string | null;
};

export type SortingArea = { areaId: string; name: string; floorId: string | null };

export type SortingFloor = { floorId: string; name: string };

/** An automation, script, scene or group, with the entities it uses. */
export type SortingFlow = {
  entityId: string;
  name: string;
  kind: EntryKind;
  categoryPath: string | null;
  uses: { entityId: string; roles: DependencyRole[] }[];
};

/** Everything the tool computes its proposals from (`GET /api/entity-sorting`). */
export type SortingContext = {
  entities: SortingEntity[];
  devices: SortingDevice[];
  areas: SortingArea[];
  floors: SortingFloor[];
  /** Integration domain → name; a missing domain falls back to the domain itself. */
  integrations: Record<string, string>;
  flows: SortingFlow[];
  /** Every folder path that exists: from entries, entities and empty folders. */
  folders: string[];
  memory: EntitySortingMemory;
};

export const ENTITY_MOVE_STATUS = {
  moved: "moved",
  /** It was there already. */
  unchanged: "unchanged",
  /** Undo only: its folder changed since the run, so it was left alone. */
  changed: "changed",
  /** HA has no registry entry for it (any more). */
  notInRegistry: "notInRegistry",
  failed: "failed",
} as const;

export type EntityMoveStatus = (typeof ENTITY_MOVE_STATUS)[keyof typeof ENTITY_MOVE_STATUS];

export type EntityMoveResult = { entityId: string; status: EntityMoveStatus; from: string | null };
