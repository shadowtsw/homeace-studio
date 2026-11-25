/**
 * Raw shapes of the Home Assistant WebSocket API. Only the fields we use; names as HA sends them.
 */

export type HaEntityRegistryEntry = {
  entity_id: string;
  /** The integration's own id, e.g. the storage id of a helper ("gaestemodus"). */
  unique_id: string;
  /** Name set by the user; null means "use the name the integration provides". */
  name: string | null;
  original_name: string | null;
  /** Icon set by the user, e.g. "mdi:lightbulb"; null means "use the integration's icon". */
  icon: string | null;
  platform: string;
  config_entry_id: string | null;
  /** One category id per scope, e.g. `{ automation: "01J…" }`. */
  categories: Partial<Record<string, string>>;
  labels: string[];
  area_id: string | null;
  /** The device the entity belongs to; null for entities without one (helpers, templates). */
  device_id?: string | null;
  disabled_by: string | null;
  hidden_by: string | null;
  /**
   * Only in `config/entity_registry/get`, not in the list: other names for Assist. Newer HA versions
   * keep a `null` in it that stands for the entity's own name.
   */
  aliases?: (string | null)[];
};

/** A device from `config/device_registry/list`. */
export type HaDevice = {
  id: string;
  name: string | null;
  /** Name set by the user; wins over `name`. */
  name_by_user: string | null;
  area_id: string | null;
};

export type HaState = {
  entity_id: string;
  state: string;
  /** `options` exists on select-like entities; unchecked, so read it as unknown. */
  attributes: {
    friendly_name?: string;
    icon?: string;
    options?: unknown;
    unit_of_measurement?: string;
    /** "motion", "door", "temperature" …; set by the integration. */
    device_class?: string;
    /** Automations and scripts: when they last ran; null when never. */
    last_triggered?: string | null;
    /** Scenes and groups: their member entities. */
    entity_id?: unknown;
  };
  /** When the state itself last changed (ISO time). */
  last_changed?: string;
};

export type HaLabel = {
  label_id: string;
  name: string;
  icon: string | null;
  /** A theme color name like "indigo" or a hex value; null when unset. */
  color: string | null;
};

export type HaArea = {
  area_id: string;
  name: string;
  icon: string | null;
};

/** An event from `subscribe_events`, e.g. `state_changed`. */
export type HaEvent = {
  event_type: string;
  data: Record<string, unknown>;
};

export type HaCategory = {
  category_id: string;
  name: string;
  icon: string | null;
};

export type HaConfigEntry = {
  entry_id: string;
  domain: string;
  title: string;
};
