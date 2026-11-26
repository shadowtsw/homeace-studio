import type { HaState } from "../../ha/ha.types";
import type { SceneValue } from "../scene.model";

export type SaveConfigOptions = {
  id: string;
  config: Record<string, unknown>;
};

export interface SceneRepository {
  /** The id of a scene in scenes.yaml (its entity's unique_id), or null when HA has none. */
  findStorageId(entityId: string): Promise<string | null>;

  /** The entity ID HA gave the scene with this id in scenes.yaml, or null while it has none yet. */
  findEntityId(id: string): Promise<string | null>;

  /** The scene's config from scenes.yaml, or null when it has none there. */
  loadConfig(id: string): Promise<Record<string, unknown> | null>;

  /** Writes the scene's config to scenes.yaml; HA reloads its scenes. */
  saveConfig(options: SaveConfigOptions): Promise<void>;

  loadStates(): Promise<HaState[]>;

  /** The unit HA shows temperatures in ("°C" or "°F"), from its general settings. */
  loadTemperatureUnit(): Promise<string>;

  /** Sets devices to the given states right now (`scene.apply`), without saving a scene. */
  apply(entities: Record<string, SceneValue>): Promise<void>;
}
