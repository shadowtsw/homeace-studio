import { CATEGORY_SCOPE } from "../../categories/categories.constants";
import { HaCommandError } from "../../ha/ha-command.error";
import type { HaDevice, HaEntityRegistryEntry } from "../../ha/ha.types";
import type { DemoEntity } from "../demo-home";
import { ensureCategory } from "./categories";
import { emit, type FakeHaData } from "./data";
import {
  domainOf,
  ERROR_CODE,
  hoursAgo,
  now,
  scopeOf,
  text,
  type FlowKind,
  type Payload,
} from "./shared";

type EnsureDeviceOptions = {
  ha: FakeHaData;
  name: string;
  areaId: string | null;
  parentId?: string;
  info?: Pick<DemoEntity, "manufacturer" | "model">;
};

/** A child device (`parentId`) has no area of its own; HA then shows the parent's. */
function ensureDevice({ ha, name, areaId, parentId, info }: EnsureDeviceOptions): HaDevice {
  const existing = [...ha.devices.values()].find(
    (device) => device.name === name && (device.parent_device_id ?? undefined) === parentId,
  );

  if (existing) return existing;

  const device: HaDevice = {
    id: `demo_device_${ha.nextId++}`,
    name,
    name_by_user: null,
    area_id: areaId,
    manufacturer: info?.manufacturer ?? null,
    model: info?.model ?? null,
    ...(parentId ? { parent_device_id: parentId } : {}),
  };
  ha.devices.set(device.id, device);

  return device;
}

/** Adds an entity like HA: registry entry (not for state-only ones), state, folder, device, config. */
export function addEntity({ ha, entity }: { ha: FakeHaData; entity: DemoEntity }): void {
  const configEntryId = entity.configEntryId ?? null;
  // Plain entities (lights, sensors) keep their folder in HomeAce Studio's own scope.
  const scope = scopeOf({ entityId: entity.entityId, configEntryId }) ?? CATEGORY_SCOPE.entities;
  const categories: Partial<Record<string, string>> = {};

  if (scope && entity.category) {
    categories[scope] = ensureCategory({ ha, scope, name: entity.category }).category_id;
  }

  // Like HA: a device carries the area, its entities inherit it.
  const areaId = entity.areaId ?? null;
  const parent = entity.parentDevice
    ? ensureDevice({ ha, name: entity.parentDevice, areaId })
    : null;
  const device = entity.device
    ? ensureDevice({
        ha,
        name: entity.device,
        areaId: parent ? null : areaId,
        parentId: parent?.id,
        info: entity,
      })
    : null;

  if (!entity.isStateOnly)
    ha.registry.set(entity.entityId, {
      entity_id: entity.entityId,
      unique_id: entity.uniqueId ?? entity.entityId,
      name: null,
      original_name: entity.name,
      icon: entity.icon ?? null,
      platform: entity.platform,
      config_entry_id: configEntryId,
      categories,
      labels: entity.labels ?? [],
      area_id: device ? null : (entity.areaId ?? null),
      device_id: device?.id ?? null,
      disabled_by: entity.isDisabled ? "user" : null,
      hidden_by: entity.isHidden ? "user" : null,
      entity_category: entity.entityCategory ?? null,
      created_at: ha.isSeeded ? Date.now() / 1000 : 0,
      // Like newer HA versions: null stands for the entity's own name.
      aliases: [null],
    });

  // Like HA: a new automation has never run
  const lastTriggered = ha.isSeeded ? null : hoursAgo(3);
  const automationAttributes =
    domainOf(entity.entityId) === "automation" ? { last_triggered: lastTriggered } : {};
  ha.states.set(entity.entityId, {
    entity_id: entity.entityId,
    state: entity.state,
    attributes: {
      friendly_name: entity.name,
      ...automationAttributes,
      ...entity.attributes,
    },
    last_changed: entity.lastChanged ?? now(),
  });

  if (entity.config && domainOf(entity.entityId) === "scene") {
    ha.sceneConfigs.set(entity.uniqueId ?? entity.entityId, structuredClone(entity.config));
  } else if (entity.config) {
    const kind = domainOf(entity.entityId) as FlowKind;
    ha.flowConfigs.get(kind)?.set(entity.uniqueId ?? entity.entityId, entity.config);
  }
}

export function removeEntity({ ha, entityId }: { ha: FakeHaData; entityId: string }): void {
  const oldState = ha.states.get(entityId) ?? null;

  ha.registry.delete(entityId);
  ha.states.delete(entityId);
  emit({
    ha,
    eventType: "entity_registry_updated",
    data: { action: "remove", entity_id: entityId },
  });
  emit({
    ha,
    eventType: "state_changed",
    data: { entity_id: entityId, old_state: oldState, new_state: null },
  });
}

export function freeEntityId({
  ha,
  domain,
  objectId,
}: {
  ha: FakeHaData;
  domain: string;
  objectId: string;
}): string {
  let candidate = `${domain}.${objectId}`;

  for (let suffix = 2; ha.states.has(candidate); suffix++) {
    candidate = `${domain}.${objectId}_${suffix}`;
  }

  return candidate;
}

export function requireEntity({
  ha,
  entityId,
}: {
  ha: FakeHaData;
  entityId: string;
}): HaEntityRegistryEntry {
  const entry = ha.registry.get(entityId);

  if (!entry) throw new HaCommandError(ERROR_CODE.notFound, "Entity not found");

  return entry;
}

function moveEntity({
  ha,
  entry,
  next,
}: {
  ha: FakeHaData;
  entry: HaEntityRegistryEntry;
  next: string;
}): void {
  if (ha.registry.has(next) || ha.states.has(next)) {
    throw new HaCommandError(ERROR_CODE.invalid, "Entity with this ID is already registered");
  }

  const previous = entry.entity_id;
  ha.registry.delete(previous);
  entry.entity_id = next;
  ha.registry.set(next, entry);

  const state = ha.states.get(previous);
  if (state) {
    ha.states.delete(previous);
    const moved = { ...state, entity_id: next };
    ha.states.set(next, moved);
    emit({
      ha,
      eventType: "state_changed",
      data: { entity_id: previous, old_state: state, new_state: null },
    });
    emit({
      ha,
      eventType: "state_changed",
      data: { entity_id: next, old_state: null, new_state: moved },
    });
  }
}

/** A disabled entity is not loaded: its state waits in `unloaded` until it is enabled again. */
function setLoaded({
  ha,
  entityId,
  isLoaded,
}: {
  ha: FakeHaData;
  entityId: string;
  isLoaded: boolean;
}): void {
  if (isLoaded) {
    const state = ha.unloaded.get(entityId);
    if (!state) return;
    ha.unloaded.delete(entityId);
    ha.states.set(entityId, state);
    emit({
      ha,
      eventType: "state_changed",
      data: { entity_id: entityId, old_state: null, new_state: state },
    });
    return;
  }

  const state = ha.states.get(entityId);
  if (!state) return;
  ha.unloaded.set(entityId, state);
  ha.states.delete(entityId);
  emit({
    ha,
    eventType: "state_changed",
    data: { entity_id: entityId, old_state: state, new_state: null },
  });
}

export function updateEntity({
  ha,
  payload,
}: {
  ha: FakeHaData;
  payload: Payload;
}): HaEntityRegistryEntry {
  const entry = requireEntity({ ha, entityId: String(payload.entity_id) });
  const fields = ["name", "icon", "area_id", "labels", "aliases", "hidden_by"] as const;

  for (const field of fields) {
    if (payload[field] !== undefined) Object.assign(entry, { [field]: payload[field] });
  }

  // Like HA: a new entity ID moves registry entry and state; the unique_id stays.
  if (typeof payload.new_entity_id === "string" && payload.new_entity_id !== entry.entity_id) {
    moveEntity({ ha, entry, next: payload.new_entity_id });
  }

  // Like HA: a disabled entity is not loaded, so it has no state until it is enabled again.
  if (payload.disabled_by !== undefined && payload.disabled_by !== entry.disabled_by) {
    entry.disabled_by = payload.disabled_by as string | null;
    setLoaded({ ha, entityId: entry.entity_id, isLoaded: entry.disabled_by === null });
  }

  // HA merges the categories per scope; null removes a scope's category.
  if (payload.categories && typeof payload.categories === "object") {
    for (const [scope, id] of Object.entries(payload.categories as Payload)) {
      if (id === null) delete entry.categories[scope];
      else entry.categories[scope] = text(id);
    }
  }

  if (payload.name !== undefined) {
    const state = ha.states.get(entry.entity_id);
    const name = (payload.name as string | null) ?? entry.original_name ?? entry.entity_id;

    if (state) state.attributes.friendly_name = name;
  }

  emit({
    ha,
    eventType: "entity_registry_updated",
    data: { action: "update", entity_id: entry.entity_id },
  });

  return structuredClone(entry);
}
