import { CATEGORY_SCOPE } from "../categories/categories.constants";
import { createDeviceContext } from "../ha/device-context";
import type {
  HaArea,
  HaCategory,
  HaDevice,
  HaEntityRegistryEntry,
  HaLabel,
  HaState,
} from "../ha/ha.types";

/** One entity as the picker of the flow editor shows it. */
export type EntityOption = {
  entityId: string;
  /** Full friendly name, e.g. "Terrace motion sensor Battery". */
  name: string;
  /** Name within its device, e.g. "Battery"; the full name for entities without a device. */
  shortName: string;
  domain: string;
  /** Current state, offered as a suggestion when a block asks for a state. */
  state: string;
  unit: string | null;
  /** HA's device class ("motion", "door" …); tells a motion sensor from a door contact. */
  deviceClass: string | null;
  /** The possible states of select-like entities (input_select, select, enum sensors). */
  options: string[] | null;
  deviceId: string | null;
  deviceName: string | null;
  /** The entity's own area, else its device's (a child device's parent counts). */
  areaId: string | null;
  areaName: string | null;
  labels: string[];
  /** Its folder ("Haus/Terrasse"), a category in HomeAce Studio's own scope; null when none. */
  categoryPath: string | null;
  /**
   * Only entities with a registry entry can be put into a folder (YAML without unique_id cannot).
   */
  isInRegistry: boolean;
  /**
   * Scripts only: the key in scripts.yaml. `action: script.<key>` runs the script and waits for it;
   * the key stays when the entity ID is renamed.
   */
  scriptKey?: string;
};

export type EntitySources = {
  states: HaState[];
  registry: HaEntityRegistryEntry[];
  devices: HaDevice[];
  areas: HaArea[];
  labels: HaLabel[];
  /** The categories of the scope `homeace_entities`, for the folder names. */
  entityCategories: HaCategory[];
};

const DOMAIN_SEPARATOR = ".";
const SCRIPT_PLATFORM = "script";

const stringList = (value: unknown): string[] | null =>
  Array.isArray(value) && value.every((item) => typeof item === "string") ? value : null;

export type NameWithinDeviceOptions = {
  name: string;
  deviceName: string | null;
};

/** "Terrace motion sensor Battery" in device "Terrace motion sensor" → "Battery". */
export function nameWithinDevice({ name, deviceName }: NameWithinDeviceOptions): string {
  if (!deviceName) return name;

  const prefix = `${deviceName} `;
  const rest = name.startsWith(prefix) ? name.slice(prefix.length).trim() : "";

  return rest || name;
}

/** Every entity with a state, with what makes it recognizable: device, area, labels, unit. */
export function toEntityOptions(sources: EntitySources): EntityOption[] {
  const registry = new Map(sources.registry.map((entry) => [entry.entity_id, entry]));
  const devices = new Map(sources.devices.map((device) => [device.id, device]));
  const deviceContext = createDeviceContext(sources.devices);
  const areaNames = new Map(sources.areas.map((area) => [area.area_id, area.name]));
  const labelNames = new Map(sources.labels.map((label) => [label.label_id, label.name]));
  const folderNames = new Map(
    sources.entityCategories.map((category) => [category.category_id, category.name]),
  );

  const options = sources.states.map((state): EntityOption => {
    const entry = registry.get(state.entity_id);
    const device = entry?.device_id ? devices.get(entry.device_id) : undefined;
    const deviceName = device ? deviceContext.nameOf(device) : null;
    const areaId = entry?.area_id ?? (device ? deviceContext.areaIdOf(device) : null);
    const name = state.attributes.friendly_name ?? state.entity_id;
    const unit = state.attributes.unit_of_measurement;
    const categoryId = entry?.categories[CATEGORY_SCOPE.entities];

    return {
      entityId: state.entity_id,
      name,
      shortName: nameWithinDevice({ name, deviceName }),
      domain: state.entity_id.split(DOMAIN_SEPARATOR)[0] ?? "",
      state: state.state,
      unit: typeof unit === "string" ? unit : null,
      deviceClass:
        typeof state.attributes.device_class === "string" ? state.attributes.device_class : null,
      options: stringList(state.attributes.options),
      deviceId: device?.id ?? null,
      deviceName,
      areaId,
      areaName: areaId ? (areaNames.get(areaId) ?? null) : null,
      labels: (entry?.labels ?? []).map((id) => labelNames.get(id) ?? id),
      categoryPath: categoryId ? (folderNames.get(categoryId) ?? null) : null,
      isInRegistry: entry !== undefined,
      ...(entry?.platform === SCRIPT_PLATFORM ? { scriptKey: entry.unique_id } : {}),
    };
  });

  return options.sort((first, second) =>
    first.name.localeCompare(second.name, undefined, { sensitivity: "base" }),
  );
}
