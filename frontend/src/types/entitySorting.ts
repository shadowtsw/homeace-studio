/** Mirrors backend/src/entity-sorting/entity-sorting.model.ts (docs/api.md). */
import type { EntryKind } from "./entry";

export type SortingConditionType =
  | "label"
  | "area"
  | "floor"
  | "manufacturer"
  | "integration"
  | "domain"
  | "deviceClass"
  | "nameContains";

/** Label, area and floor hold ids; the rest plain values. */
export type SortingCondition = { type: SortingConditionType; value: string };

/** All conditions must match. The target may hold `{area}` and `{floor}`. */
export type SortingRule = { conditions: SortingCondition[]; target: string };

export type SortingRejection = { bundleKey: string; paths: string[] };

export type SortingRunMove = { entityId: string; from: string | null; to: string | null };

export type SortingRun = { runId: string; at: string; moves: SortingRunMove[] };

export type EntitySortingMemory = {
  rules: SortingRule[];
  rejected: SortingRejection[];
  ignored: string[];
  lastRun: SortingRun | null;
};

export type SortingEntity = {
  entityId: string;
  name: string;
  domain: string;
  deviceId: string | null;
  areaId: string | null;
  deviceClass: string | null;
  entityCategory: "config" | "diagnostic" | null;
  integration: string | null;
  labels: string[];
  categoryPath: string | null;
  isDisabled: boolean;
  isHidden: boolean;
  isInRegistry: boolean;
};

export type SortingDevice = {
  deviceId: string;
  name: string;
  areaId: string | null;
  manufacturer: string | null;
  model: string | null;
  isService: boolean;
};

export type SortingArea = { areaId: string; name: string; floorId: string | null };

export type SortingFloor = { floorId: string; name: string };

export type SortingRole = "trigger" | "condition" | "action" | "member" | "value" | "call";

export type SortingFlow = {
  entityId: string;
  name: string;
  kind: EntryKind;
  categoryPath: string | null;
  uses: { entityId: string; roles: SortingRole[] }[];
};

export type SortingContext = {
  entities: SortingEntity[];
  devices: SortingDevice[];
  areas: SortingArea[];
  floors: SortingFloor[];
  integrations: Record<string, string>;
  flows: SortingFlow[];
  folders: string[];
  memory: EntitySortingMemory;
};

export type EntityMoveStatus = "moved" | "unchanged" | "changed" | "notInRegistry" | "failed";

export type EntityMoveResult = { entityId: string; status: EntityMoveStatus; from: string | null };
