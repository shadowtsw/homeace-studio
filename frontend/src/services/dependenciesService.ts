import { apiFetch } from "./api";

/** What a flow does with an entity, in display order. */
export type DependencyRole = "trigger" | "condition" | "action" | "member" | "value" | "call";

export const DEPENDENCY_ROLES: readonly DependencyRole[] = [
  "trigger",
  "condition",
  "action",
  "member",
  "value",
  "call",
];

/** An automation, script, scene or group that uses an entity. */
export type DependencyUser = { entityId: string; name: string; roles: DependencyRole[] };

export type DependencyUse = {
  entityId: string;
  /** null when the entity no longer exists. */
  name: string | null;
  roles: DependencyRole[];
  exists: boolean;
  alsoUsedBy: DependencyUser[];
};

export type Dependencies = { entityId: string; uses: DependencyUse[]; usedBy: DependencyUser[] };

export function fetchDependencies(entityId: string): Promise<Dependencies> {
  return apiFetch<Dependencies>({ path: `/dependencies/${encodeURIComponent(entityId)}` });
}
