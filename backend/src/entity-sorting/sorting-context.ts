import { sortedRoles, type DependencyIndex } from "../dependencies/dependency-analysis";
import type { Entry } from "../entries/entry.model";
import { createDeviceContext } from "../ha/device-context";
import type {
  HaArea,
  HaCategory,
  HaDevice,
  HaEntityRegistryEntry,
  HaFloor,
  HaLabel,
  HaState,
} from "../ha/ha.types";
import { CATEGORY_SCOPE } from "../categories/categories.constants";
import type {
  EntitySortingMemory,
  FolderContent,
  SortingContext,
  SortingDevice,
  SortingEntity,
  SortingFlow,
} from "./entity-sorting.model";

/** Everything the context is built from; read by the service, kept pure here for the tests. */
export type SortingSources = {
  entries: Entry[];
  states: HaState[];
  registry: HaEntityRegistryEntry[];
  devices: HaDevice[];
  areas: HaArea[];
  floors: HaFloor[];
  labels: HaLabel[];
  /** Categories of HomeAce Studio's own scope, for the folder names of plain entities. */
  entityCategories: HaCategory[];
  integrations: Record<string, string>;
  dependencies: DependencyIndex;
  /** Folders the user created without entries (overlay). */
  emptyFolders: string[];
  memory: EntitySortingMemory;
};

const DOMAIN_SEPARATOR = ".";
const ENTITY_CATEGORIES = new Set(["config", "diagnostic"]);

/**
 * The name for an entity without state (disabled): user name, else device name + own name, like most
 * integrations name them today. HA 2026.11 leaves `has_entity_name` out of the list, so it is only
 * used when present (tested on a throwaway HA).
 */
function registryName(entry: HaEntityRegistryEntry, deviceName: string | null): string {
  if (entry.name) return entry.name;

  const usesDeviceName = entry.has_entity_name ?? deviceName !== null;
  if (usesDeviceName && deviceName)
    return entry.original_name ? `${deviceName} ${entry.original_name}` : deviceName;

  return entry.original_name ?? entry.entity_id;
}

/**
 * The tool's view of the home: every plain entity (also disabled ones and YAML ones without
 * unique_id), their devices, areas and floors, and the flows that use them, with their folders.
 * Automations, scripts, scenes and helpers are left out as entities: they have folders of their own.
 */
export function buildSortingContext(sources: SortingSources): SortingContext {
  const entryIds = new Set(sources.entries.map((entry) => entry.entityId));
  const states = new Map(sources.states.map((state) => [state.entity_id, state]));
  const devices = new Map(sources.devices.map((device) => [device.id, device]));
  const deviceContext = createDeviceContext(sources.devices);
  const labelNames = new Map(sources.labels.map((label) => [label.label_id, label.name]));
  const folderNames = new Map(
    sources.entityCategories.map((category) => [category.category_id, category.name]),
  );

  const fromRegistry = sources.registry
    .filter((entry) => !entryIds.has(entry.entity_id))
    .map((entry): SortingEntity => {
      const device = entry.device_id ? devices.get(entry.device_id) : undefined;
      const deviceName = device ? deviceContext.nameOf(device) : null;
      const state = states.get(entry.entity_id);
      const categoryId = entry.categories[CATEGORY_SCOPE.entities];
      const category = entry.entity_category ?? null;

      return {
        entityId: entry.entity_id,
        name: state?.attributes.friendly_name ?? registryName(entry, deviceName),
        domain: entry.entity_id.split(DOMAIN_SEPARATOR)[0] ?? "",
        deviceId: device?.id ?? null,
        areaId: entry.area_id ?? (device ? deviceContext.areaIdOf(device) : null),
        deviceClass: state?.attributes.device_class ?? null,
        entityCategory: category && ENTITY_CATEGORIES.has(category) ? category : null,
        integration: entry.platform || null,
        labels: entry.labels.map((id) => labelNames.get(id) ?? id),
        categoryPath: categoryId ? (folderNames.get(categoryId) ?? null) : null,
        isDisabled: entry.disabled_by !== null,
        isHidden: entry.hidden_by !== null,
        isInRegistry: true,
      };
    });
  const inRegistry = new Set(sources.registry.map((entry) => entry.entity_id));
  const stateOnly = sources.states
    .filter((state) => !inRegistry.has(state.entity_id) && !entryIds.has(state.entity_id))
    .map((state): SortingEntity => ({
      entityId: state.entity_id,
      name: state.attributes.friendly_name ?? state.entity_id,
      domain: state.entity_id.split(DOMAIN_SEPARATOR)[0] ?? "",
      deviceId: null,
      areaId: null,
      deviceClass: state.attributes.device_class ?? null,
      entityCategory: null,
      integration: null,
      labels: [],
      categoryPath: null,
      isDisabled: false,
      isHidden: false,
      isInRegistry: false,
    }));

  const usedDevices = new Set(fromRegistry.map((entity) => entity.deviceId).filter(Boolean));
  const sortingDevices = sources.devices
    .filter((device) => usedDevices.has(device.id))
    .map((device): SortingDevice => ({
      deviceId: device.id,
      name: deviceContext.nameOf(device) ?? device.id,
      areaId: deviceContext.areaIdOf(device),
      manufacturer: device.manufacturer ?? null,
      model: device.model ?? null,
      isService: device.entry_type === "service",
    }));

  return {
    entities: [...fromRegistry, ...stateOnly],
    devices: sortingDevices,
    areas: sources.areas.map((area) => ({
      areaId: area.area_id,
      name: area.name,
      floorId: area.floor_id ?? null,
    })),
    floors: sources.floors.map((floor) => ({ floorId: floor.floor_id, name: floor.name })),
    integrations: sources.integrations,
    flows: flowsOf(sources.entries, sources.dependencies),
    entries: sources.entries.map((entry) => ({
      entityId: entry.entityId,
      name: entry.name,
      kind: entry.kind,
      categoryPath: entry.categoryPath,
      labels: entry.labels.map((label) => label.name),
      areaId: entry.area?.areaId ?? null,
    })),
    folders: foldersOf(sources, fromRegistry),
    folderKinds: folderKindsOf(sources, fromRegistry),
    memory: sources.memory,
  };
}

/** Users from the dependency index that are entries; their folder is what the tool learns from. */
function flowsOf(entries: Entry[], dependencies: DependencyIndex): SortingFlow[] {
  const byId = new Map(entries.map((entry) => [entry.entityId, entry]));
  const flows: SortingFlow[] = [];

  for (const [userId, refs] of dependencies) {
    const entry = byId.get(userId);
    if (!entry || refs.size === 0) continue;

    flows.push({
      entityId: userId,
      name: entry.name,
      kind: entry.kind,
      categoryPath: entry.categoryPath,
      uses: [...refs].map(([entityId, roles]) => ({ entityId, roles: sortedRoles(roles) })),
    });
  }

  return flows;
}

function folderKindsOf(
  sources: SortingSources,
  entities: SortingEntity[],
): Record<string, FolderContent[]> {
  const kinds = new Map<string, Set<FolderContent>>();
  const add = (path: string | null, kind: FolderContent): void => {
    if (path) kinds.set(path, (kinds.get(path) ?? new Set()).add(kind));
  };

  sources.entries.forEach((entry) => add(entry.categoryPath, entry.kind));
  entities.forEach((entity) => add(entity.categoryPath, "entity"));
  sources.emptyFolders.forEach((path) => {
    if (!kinds.has(path)) add(path, "empty");
  });

  return Object.fromEntries([...kinds].map(([path, set]) => [path, [...set].sort()]));
}

function foldersOf(sources: SortingSources, entities: SortingEntity[]): string[] {
  const paths = [
    ...sources.entries.map((entry) => entry.categoryPath),
    ...entities.map((entity) => entity.categoryPath),
    ...sources.emptyFolders,
  ].filter((path): path is string => !!path);

  return [...new Set(paths)].sort((first, second) => first.localeCompare(second));
}
