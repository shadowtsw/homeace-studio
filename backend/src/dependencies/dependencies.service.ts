import { Injectable } from "@nestjs/common";

import { HomeSnapshotService, type HomeSnapshot } from "../snapshot/home-snapshot.service";
import {
  buildDependencyIndex,
  sortedRoles,
  type DependencyIndex,
  type DependencyRole,
} from "./dependency-analysis";

/** Someone that uses an entity: an automation, script, scene or group. */
export type DependencyUser = {
  entityId: string;
  name: string;
  /** What it does with the entity. */
  roles: DependencyRole[];
};

/** Something an entry uses. */
export type DependencyUse = {
  entityId: string;
  /** Friendly name; null when the entity no longer exists. */
  name: string | null;
  roles: DependencyRole[];
  /** False when HA no longer knows it. */
  exists: boolean;
  /** Who else uses it, besides this entry. */
  alsoUsedBy: DependencyUser[];
};

export type Dependencies = {
  entityId: string;
  uses: DependencyUse[];
  usedBy: DependencyUser[];
};

/** What an entry uses, and who uses it (docs/api.md). */
@Injectable()
export class DependenciesService {
  private indexed: { snapshot: HomeSnapshot; index: DependencyIndex } | null = null;

  constructor(private readonly snapshots: HomeSnapshotService) {}

  async forEntity(entityId: string): Promise<Dependencies> {
    const snapshot = await this.snapshots.get();
    const index = this.indexOf(snapshot);
    const names = new Map(
      snapshot.states.map((state) => [state.entity_id, state.attributes.friendly_name ?? null]),
    );
    const entryNames = new Map(snapshot.entries.map((entry) => [entry.entityId, entry.name]));
    const known = new Set([
      ...snapshot.states.map((state) => state.entity_id),
      ...snapshot.registry.map((entry) => entry.entity_id),
    ]);
    const nameOf = (id: string): string | null => entryNames.get(id) ?? names.get(id) ?? null;
    const usersOf = ({ id, except }: { id: string; except: string }): DependencyUser[] =>
      [...index]
        .filter(([userId, refs]) => userId !== except && refs.has(id))
        .map(([userId, refs]) => ({
          entityId: userId,
          name: nameOf(userId) ?? userId,
          roles: sortedRoles(refs.get(id) ?? []),
        }))
        .sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: "base" }));

    const uses = [...(index.get(entityId) ?? [])].map(([id, roles]): DependencyUse => ({
      entityId: id,
      name: nameOf(id),
      roles: sortedRoles(roles),
      exists: known.has(id),
      alsoUsedBy: usersOf({ id, except: entityId }),
    }));

    return { entityId, uses, usedBy: usersOf({ id: entityId, except: entityId }) };
  }

  /** The same snapshot gives the same index; built once (also used by the area view). */
  indexOf(snapshot: HomeSnapshot): DependencyIndex {
    if (this.indexed?.snapshot === snapshot) return this.indexed.index;

    const index = buildDependencyIndex(snapshot);
    this.indexed = { snapshot, index };
    return index;
  }
}
