import type { HaState } from "../../ha/ha.types";
import type { SceneValue } from "../scene.model";

export interface SceneRepository {
  /** The id of a scene in scenes.yaml (its entity's unique_id), or null when HA has none. */
  findStorageId(entityId: string): Promise<string | null>;

  /** The scene's config from scenes.yaml, or null when it has none there. */
  loadConfig(id: string): Promise<Record<string, unknown> | null>;

  /** Writes the scene's config to scenes.yaml; HA reloads its scenes. */
  saveConfig(id: string, config: Record<string, unknown>): Promise<void>;

  loadStates(): Promise<HaState[]>;

  /** Sets devices to the given states right now (`scene.apply`), without saving a scene. */
  apply(entities: Record<string, SceneValue>): Promise<void>;
}
