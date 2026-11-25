import {
  DEPENDENCY_ROLES,
  type DependencyRole,
  type DependencyUse,
} from "@/services/dependenciesService";
import type { EntryKind } from "@/types/entry";

export type RoleGroup = { role: DependencyRole; uses: DependencyUse[] };

/** What an entry uses, grouped by role; an entity used in two ways shows up in both groups. */
export function groupUsesByRole(uses: DependencyUse[]): RoleGroup[] {
  return DEPENDENCY_ROLES.map((role) => ({
    role,
    uses: uses.filter((use) => use.roles.includes(role)),
  })).filter((group) => group.uses.length > 0);
}

/** How many different things it uses, and how many of them are gone. */
export function countUses(uses: DependencyUse[]): { total: number; gone: number } {
  return { total: uses.length, gone: uses.filter((use) => !use.exists).length };
}

/** Where a missing entity is fixed: a scene lists it under "Zustände", a flow in its blocks. */
export function goneHintKey(kind: EntryKind): "deps.goneHint" | "deps.goneHintScene" {
  return kind === "scene" ? "deps.goneHintScene" : "deps.goneHint";
}
