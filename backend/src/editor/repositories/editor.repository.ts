import type { HaState } from "../../ha/ha.types";
import type { CatalogSources } from "../catalog.mapper";
import type { FlowKind } from "../editor.model";

export type LoadConfigOptions = {
  kind: FlowKind;
  entityId: string;
};

export type LoadStorageKeyOptions = {
  kind: FlowKind;
  entityId: string;
  config: Record<string, unknown>;
};

export type LoadStoredConfigOptions = {
  kind: FlowKind;
  key: string;
};

export type SaveConfigOptions = {
  kind: FlowKind;
  key: string;
  config: Record<string, unknown>;
};

export type DeleteConfigOptions = {
  kind: FlowKind;
  key: string;
};

export type FindEntityIdOptions = {
  kind: FlowKind;
  key: string;
};

export type LoadCategoryIdOptions = {
  kind: FlowKind;
  entityId: string;
};

export interface EditorRepository {
  /** HA's descriptions and translations of triggers, conditions and actions in one language. */
  loadCatalogSources(language: string): Promise<CatalogSources>;
  /** The config of an automation or script as HA runs it. */
  loadConfig(options: LoadConfigOptions): Promise<Record<string, unknown>>;
  loadStates(): Promise<HaState[]>;
  /**
   * The key the config file stores the flow under: the `id` of an automation, the object key of a
   * script. Null when there is none (e.g. a YAML automation without `id`).
   */
  loadStorageKey(options: LoadStorageKeyOptions): Promise<string | null>;
  /**
   * The flow as automations.yaml / scripts.yaml holds it; null when it lives elsewhere
   * (packages, other YAML files). Only those files can be written.
   */
  loadStoredConfig(options: LoadStoredConfigOptions): Promise<Record<string, unknown> | null>;
  /**
   * Writes the whole flow into its file (adds it when the key is new); HA validates and reloads.
   */
  saveConfig(options: SaveConfigOptions): Promise<void>;
  /** Removes the flow from its file; HA removes the entity. */
  deleteConfig(options: DeleteConfigOptions): Promise<void>;
  /** The entity of a flow by its storage key, or null while HA has not registered it yet. */
  findEntityId(options: FindEntityIdOptions): Promise<string | null>;
  /** The entity's category in the flow's own scope (automation / script), if any. */
  loadCategoryId(options: LoadCategoryIdOptions): Promise<string | null>;
}
