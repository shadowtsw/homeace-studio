import { CATEGORY_SCOPE, type CategoryScope } from "../categories/categories.constants";
import { HELPER_DOMAINS } from "../entries/entries.constants";
import { HaCommandError } from "../ha/ha-command.error";
import { HaRestError } from "../ha/ha-rest.service";
import { HA_COMMAND, HA_REST_PATH } from "../ha/ha.constants";
import type {
  HaCategory,
  HaEntityRegistryEntry,
  HaEvent,
  HaLabel,
  HaArea,
  HaDevice,
  HaState,
} from "../ha/ha.types";
import { DEMO_EVENT_DELAY_MS } from "./demo.constants";
import type { DemoEntity, DemoHome } from "./demo-home";
import type { DemoTrace } from "./demo-traces";

type Payload = Record<string, unknown>;
type EventHandler = (event: HaEvent) => void;
type FlowKind = "automation" | "script";

const HTTP_BAD_REQUEST = 400;
const HTTP_NOT_FOUND = 404;
const DOMAIN_SEPARATOR = ".";
const FALLBACK_LANGUAGE = "en";

/** HA's error codes for the cases the demo reproduces. */
const ERROR_CODE = {
  notFound: "not_found",
  invalid: "invalid_format",
  unknownCommand: "unknown_command",
} as const;

const HELPER_COMMAND = /^([a-z_]+)\/(create|delete|list|update)$/;

/** What HA stores for a helper when the demo home only gives its state: its settings, from the
 *  state attributes or HA's defaults. */
const HELPER_DEFAULTS: Record<string, Payload> = {
  input_number: { min: 0, max: 100, step: 1, mode: "slider" },
  input_text: { min: 0, max: 100, mode: "text" },
  input_select: { options: [] },
  input_datetime: { has_date: true, has_time: true },
  counter: { initial: 0, step: 1, restore: true },
  timer: { duration: "0:05:00", restore: false },
};
/** State attributes that are settings of the helper (the rest, like friendly_name, are not). */
const HELPER_SETTING_ATTRIBUTES: Record<string, string[]> = {
  input_number: ["min", "max", "step", "mode", "unit_of_measurement"],
  input_text: ["min", "max", "mode", "pattern"],
  input_select: ["options"],
  input_datetime: ["has_date", "has_time"],
  counter: ["initial", "step", "minimum", "maximum"],
  timer: ["duration"],
};

/** Service calls that change a state, by service name. */
const STATE_BY_SERVICE: Partial<Record<string, string>> = {
  turn_on: "on",
  turn_off: "off",
  open_cover: "open",
  close_cover: "closed",
  open_valve: "open",
  close_valve: "closed",
};

/** A payload value as text; HA's payloads are untyped. */
function text(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function domainOf(entityId: string): string {
  return entityId.split(DOMAIN_SEPARATOR)[0] ?? "";
}

/** "Gute Nacht" → "gute_nacht", like HA builds object ids from names. */
function slugify(name: string): string {
  return (
    name
      .toLowerCase()
      .normalize("NFKD")
      .replace(/[̀-ͯ]/g, "")
      .replace(/[^a-z0-9]+/g, "_")
      .replace(/^_+|_+$/g, "") || "unnamed"
  );
}

function scopeOf(entityId: string, configEntryId: string | null): CategoryScope | null {
  const domain = domainOf(entityId);

  if (domain === "automation" || domain === "script" || domain === "scene") return domain;
  if (HELPER_DOMAINS.has(domain) || configEntryId) return CATEGORY_SCOPE.helpers;

  return null;
}

function now(): string {
  return new Date().toISOString();
}

function hoursAgo(hours: number): string {
  return new Date(Date.now() - hours * 60 * 60 * 1000).toISOString();
}

/**
 * A small Home Assistant in memory for demo mode.
 *
 * Answers the WebSocket commands and REST calls HomeAce Studio uses, with HA's shapes and the
 * same rules where they matter (one category list per scope, duplicate names refused, saving a new
 * automation registers its entity). Changes fire HA's events, so live updates work as well.
 */
export class FakeHa {
  private readonly registry = new Map<string, HaEntityRegistryEntry>();
  private readonly states = new Map<string, HaState>();
  /** Stored helpers by "<type>.<id>", once created or updated; others come from their state. */
  private readonly helperItems = new Map<string, Payload>();
  private readonly categories = new Map<CategoryScope, HaCategory[]>();
  /** scenes.yaml by scene id. */
  private readonly sceneConfigs = new Map<string, Payload>();
  private readonly flowConfigs = new Map<FlowKind, Map<string, Payload>>([
    ["automation", new Map()],
    ["script", new Map()],
  ]);
  private readonly handlers = new Map<string, EventHandler[]>();
  private readonly devices = new Map<string, HaDevice>();
  private readonly areas: HaArea[];
  private readonly labels: HaLabel[];
  private nextId = 1;
  /** The demo home's own entities count as old, like a home in use; later ones are new. */
  private isSeeded = false;

  constructor(private readonly home: DemoHome) {
    this.areas = home.areas;
    this.labels = home.labels;

    for (const scope of Object.values(CATEGORY_SCOPE)) this.categories.set(scope, []);
    for (const entity of home.entities) this.addEntity(entity);
    this.isSeeded = true;
  }

  /** Answers one WebSocket command like HA would, or throws {@link HaCommandError}. */
  call(type: string, payload: Payload = {}): unknown {
    switch (type) {
      case HA_COMMAND.getStates:
        return structuredClone([...this.states.values()]);
      case HA_COMMAND.entityRegistryList:
        return structuredClone([...this.registry.values()]);
      case HA_COMMAND.entityRegistryGet:
        return structuredClone(this.requireEntity(String(payload.entity_id)));
      case HA_COMMAND.entityRegistryUpdate:
        return this.updateEntity(payload);
      case HA_COMMAND.categoryRegistryList:
        return structuredClone(this.categoryList(payload.scope));
      case HA_COMMAND.categoryRegistryCreate:
        return this.createCategory(payload);
      case HA_COMMAND.categoryRegistryUpdate:
        return this.renameCategory(payload);
      case HA_COMMAND.categoryRegistryDelete:
        return this.deleteCategory(payload);
      case HA_COMMAND.labelRegistryList:
        return structuredClone(this.labels);
      case HA_COMMAND.labelRegistryCreate:
        return this.createLabel(payload);
      case HA_COMMAND.labelRegistryUpdate:
        return this.updateLabel(payload);
      case HA_COMMAND.labelRegistryDelete:
        return this.deleteLabel(payload);
      case HA_COMMAND.deviceRegistryList:
        return structuredClone([...this.devices.values()]);
      case HA_COMMAND.areaRegistryList:
        return structuredClone(this.areas);
      case HA_COMMAND.floorRegistryList:
        return structuredClone(this.home.floors);
      // A card, no icon pack: the demo runs outside HA, where packs cannot load anyway
      case HA_COMMAND.lovelaceResources:
        return [{ id: "1", type: "module", url: "/local/community/lovelace-mushroom/mushroom.js" }];
      case HA_COMMAND.traceList:
        return this.listTraces(payload);
      case HA_COMMAND.traceGet:
        return this.getTrace(payload);
      case HA_COMMAND.areaRegistryCreate:
        return this.createArea(payload);
      case HA_COMMAND.areaRegistryUpdate:
        return this.updateArea(payload);
      case HA_COMMAND.areaRegistryDelete:
        return this.deleteArea(payload);
      case HA_COMMAND.configEntriesGet:
        return structuredClone(this.home.helperConfigEntries);
      case HA_COMMAND.callService:
        return this.callService(payload);
      case HA_COMMAND.getServices:
        return structuredClone(this.home.services);
      case HA_COMMAND.getTranslations:
        return { resources: this.translations(payload) };
      case HA_COMMAND.automationConfig:
        return { config: this.flowConfigOf("automation", String(payload.entity_id)) };
      case HA_COMMAND.scriptConfig:
        return { config: this.flowConfigOf("script", String(payload.entity_id)) };
      case HA_COMMAND.unsubscribeEvents:
        return null;
      default:
        return this.helperCommand(type, payload);
    }
  }

  /** First event of a subscription command: the demo has no new-style triggers or conditions. */
  snapshot(type: string): unknown {
    if (
      type === HA_COMMAND.triggerPlatformsSubscribe ||
      type === HA_COMMAND.conditionPlatformsSubscribe
    ) {
      return {};
    }

    throw new HaCommandError(ERROR_CODE.unknownCommand, `Unknown command ${type}`);
  }

  subscribe(eventType: string, handler: EventHandler): void {
    this.handlers.set(eventType, [...(this.handlers.get(eventType) ?? []), handler]);
  }

  /** REST GET below `/api`; null for unknown resources, like HA's 404. */
  restGet(path: string): unknown {
    if (path.startsWith(HA_REST_PATH.sceneConfig)) {
      const config = this.sceneConfigs.get(
        decodeURIComponent(path.slice(HA_REST_PATH.sceneConfig.length)),
      );
      return config ? structuredClone(config) : null;
    }

    const { kind, key } = this.parseFlowPath(path);
    const config = this.flowConfigs.get(kind)?.get(key);

    return config ? structuredClone(config) : null;
  }

  /** REST POST below `/api`: saves an automation or script; a new key creates its entity. */
  restPost(path: string, body: unknown): unknown {
    if (path.startsWith(HA_REST_PATH.sceneConfig)) return this.saveScene(path, body);

    const { kind, key } = this.parseFlowPath(path);
    const config = structuredClone(body) as Payload;

    if (typeof config !== "object" || config === null || Array.isArray(config)) {
      throw new HaRestError(HTTP_BAD_REQUEST, "Message malformed: expected a dictionary");
    }

    this.flowConfigs.get(kind)?.set(key, config);
    const name = typeof config.alias === "string" && config.alias ? config.alias : key;
    const existing = [...this.registry.values()].find(
      (entry) => entry.platform === kind && entry.unique_id === key,
    );

    if (existing) {
      this.setState(existing.entity_id, this.states.get(existing.entity_id)?.state ?? "on", {
        friendly_name: name,
      });
    } else {
      const objectId = kind === "script" ? key : slugify(name);
      this.addEntity({
        entityId: this.freeEntityId(kind, objectId),
        name,
        state: kind === "automation" ? "on" : "off",
        platform: kind,
        uniqueId: key,
      });
      this.emit("entity_registry_updated", { action: "create" });
    }

    return { result: "ok" };
  }

  /** REST DELETE below `/api`: removes an automation or script and its entity. */
  restDelete(path: string): void {
    const { kind, key } = this.parseFlowPath(path);
    const configs = this.flowConfigs.get(kind);

    if (!configs?.has(key)) throw new HaRestError(HTTP_NOT_FOUND, "Resource not found");

    configs.delete(key);
    const entry = [...this.registry.values()].find(
      (item) => item.platform === kind && item.unique_id === key,
    );

    if (entry) this.removeEntity(entry.entity_id);
  }

  private addEntity(entity: DemoEntity): void {
    const configEntryId = entity.configEntryId ?? null;
    // Plain entities (lights, sensors) keep their folder in HomeAce Studio's own scope.
    const scope = scopeOf(entity.entityId, configEntryId) ?? CATEGORY_SCOPE.entities;
    const categories: Partial<Record<string, string>> = {};

    if (scope && entity.category) {
      categories[scope] = this.ensureCategory(scope, entity.category).category_id;
    }

    // Like HA: a device carries the area, its entities inherit it.
    const areaId = entity.areaId ?? null;
    const parent = entity.parentDevice ? this.ensureDevice(entity.parentDevice, areaId) : null;
    const device = entity.device
      ? this.ensureDevice(entity.device, parent ? null : areaId, parent?.id)
      : null;

    this.registry.set(entity.entityId, {
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
      hidden_by: null,
      created_at: this.isSeeded ? Date.now() / 1000 : 0,
      // Like newer HA versions: null stands for the entity's own name.
      aliases: [null],
    });
    this.states.set(entity.entityId, {
      entity_id: entity.entityId,
      state: entity.state,
      attributes: {
        friendly_name: entity.name,
        // Like HA: a new automation has never run
        ...(domainOf(entity.entityId) === "automation"
          ? { last_triggered: this.isSeeded ? null : hoursAgo(3) }
          : {}),
        ...entity.attributes,
      },
      last_changed: entity.lastChanged ?? now(),
    });

    if (entity.config && domainOf(entity.entityId) === "scene") {
      this.sceneConfigs.set(entity.uniqueId ?? entity.entityId, structuredClone(entity.config));
    } else if (entity.config) {
      const kind = domainOf(entity.entityId) as FlowKind;
      this.flowConfigs.get(kind)?.set(entity.uniqueId ?? entity.entityId, entity.config);
    }
  }

  /** A child device (`parentId`) has no area of its own; HA then shows the parent's. */
  private ensureDevice(name: string, areaId: string | null, parentId?: string): HaDevice {
    const existing = [...this.devices.values()].find(
      (device) => device.name === name && (device.parent_device_id ?? undefined) === parentId,
    );

    if (existing) return existing;

    const device: HaDevice = {
      id: `demo_device_${this.nextId++}`,
      name,
      name_by_user: null,
      area_id: areaId,
      ...(parentId ? { parent_device_id: parentId } : {}),
    };
    this.devices.set(device.id, device);

    return device;
  }

  /** Like HA: summaries without steps and context, of one item or of a whole domain. */
  private listTraces(payload: Payload): unknown[] {
    return this.home.traces
      .filter(
        (trace) =>
          (!payload.domain || trace.domain === payload.domain) &&
          (payload.item_id === undefined || trace.item_id === payload.item_id),
      )
      .map((trace) => {
        const summary: Partial<DemoTrace> = structuredClone(trace);
        delete summary.trace;
        delete summary.context;
        return summary;
      });
  }

  private getTrace(payload: Payload): unknown {
    const trace = this.home.traces.find(
      (item) =>
        item.domain === payload.domain &&
        item.item_id === payload.item_id &&
        item.run_id === payload.run_id,
    );
    if (!trace) throw new HaCommandError(ERROR_CODE.notFound, "The trace could not be found");
    return structuredClone(trace);
  }

  /** Like HA: names are unique (ignoring case), the ID comes from the name. */
  private createArea(payload: Payload): HaArea {
    const name = text(payload.name).trim();
    this.requireFreeAreaName(name, null);

    const base = slugify(name) || "area";
    let areaId = base;
    for (let n = 2; this.areas.some((area) => area.area_id === areaId); n++)
      areaId = `${base}_${n}`;

    const area: HaArea = {
      area_id: areaId,
      name,
      icon: typeof payload.icon === "string" ? payload.icon : null,
    };
    this.areas.push(area);
    this.emit("area_registry_updated", { action: "create", area_id: areaId });

    return structuredClone(area);
  }

  private updateArea(payload: Payload): HaArea {
    const area = this.requireArea(payload.area_id);

    if (payload.name !== undefined) {
      const name = text(payload.name).trim();
      this.requireFreeAreaName(name, area.area_id);
      area.name = name;
    }
    if (payload.icon !== undefined)
      area.icon = typeof payload.icon === "string" ? payload.icon : null;

    this.emit("area_registry_updated", { action: "update", area_id: area.area_id });

    return structuredClone(area);
  }

  /** Like HA: devices and entities in the area lose it. */
  private deleteArea(payload: Payload): null {
    const area = this.requireArea(payload.area_id);

    this.areas.splice(this.areas.indexOf(area), 1);
    for (const device of this.devices.values())
      if (device.area_id === area.area_id) device.area_id = null;
    for (const entry of this.registry.values())
      if (entry.area_id === area.area_id) entry.area_id = null;
    this.emit("area_registry_updated", { action: "remove", area_id: area.area_id });

    return null;
  }

  private requireArea(areaId: unknown): HaArea {
    const area = this.areas.find((item) => item.area_id === areaId);
    if (!area) throw new HaCommandError(ERROR_CODE.notFound, "Area not found");
    return area;
  }

  private requireFreeAreaName(name: string, ownId: string | null): void {
    const taken = this.areas.some(
      (area) => area.area_id !== ownId && area.name.toLowerCase() === name.toLowerCase(),
    );
    if (!name || taken)
      throw new HaCommandError(ERROR_CODE.invalid, `The name "${name}" is already in use`);
  }

  private createLabel(payload: Payload): HaLabel {
    const name = text(payload.name).trim();
    this.requireFreeLabelName(name, null);

    const base = slugify(name) || "label";
    let labelId = base;
    for (let n = 2; this.labels.some((label) => label.label_id === labelId); n++)
      labelId = `${base}_${n}`;

    const label: HaLabel = {
      label_id: labelId,
      name,
      icon: typeof payload.icon === "string" ? payload.icon : null,
      color: typeof payload.color === "string" ? payload.color : null,
    };
    this.labels.push(label);
    this.emit("label_registry_updated", { action: "create", label_id: labelId });

    return structuredClone(label);
  }

  private updateLabel(payload: Payload): HaLabel {
    const label = this.requireLabel(payload.label_id);

    if (payload.name !== undefined) {
      const name = text(payload.name).trim();
      this.requireFreeLabelName(name, label.label_id);
      label.name = name;
    }
    if (payload.icon !== undefined)
      label.icon = typeof payload.icon === "string" ? payload.icon : null;
    if (payload.color !== undefined)
      label.color = typeof payload.color === "string" ? payload.color : null;
    this.emit("label_registry_updated", { action: "update", label_id: label.label_id });

    return structuredClone(label);
  }

  /** Like HA: the label goes from every entity; flows that name it keep the id and do less. */
  private deleteLabel(payload: Payload): null {
    const label = this.requireLabel(payload.label_id);

    this.labels.splice(this.labels.indexOf(label), 1);
    for (const entry of this.registry.values())
      entry.labels = entry.labels.filter((id) => id !== label.label_id);
    this.emit("label_registry_updated", { action: "remove", label_id: label.label_id });

    return null;
  }

  private requireLabel(labelId: unknown): HaLabel {
    const label = this.labels.find((item) => item.label_id === labelId);
    if (!label) throw new HaCommandError(ERROR_CODE.notFound, "Label not found");

    return label;
  }

  private requireFreeLabelName(name: string, ownId: string | null): void {
    const taken = this.labels.some(
      (label) => label.label_id !== ownId && label.name.toLowerCase() === name.toLowerCase(),
    );
    if (!name || taken)
      throw new HaCommandError(ERROR_CODE.invalid, `The name "${name}" is already in use`);
  }

  private removeEntity(entityId: string): void {
    const oldState = this.states.get(entityId) ?? null;

    this.registry.delete(entityId);
    this.states.delete(entityId);
    this.emit("entity_registry_updated", { action: "remove", entity_id: entityId });
    this.emit("state_changed", { entity_id: entityId, old_state: oldState, new_state: null });
  }

  private freeEntityId(domain: string, objectId: string): string {
    let candidate = `${domain}.${objectId}`;

    for (let suffix = 2; this.states.has(candidate); suffix++) {
      candidate = `${domain}.${objectId}_${suffix}`;
    }

    return candidate;
  }

  private requireEntity(entityId: string): HaEntityRegistryEntry {
    const entry = this.registry.get(entityId);

    if (!entry) throw new HaCommandError(ERROR_CODE.notFound, "Entity not found");

    return entry;
  }

  private updateEntity(payload: Payload): HaEntityRegistryEntry {
    const entry = this.requireEntity(String(payload.entity_id));
    const fields = ["name", "icon", "area_id", "labels", "aliases", "hidden_by"] as const;

    for (const field of fields) {
      if (payload[field] !== undefined) Object.assign(entry, { [field]: payload[field] });
    }

    // Like HA: a new entity ID moves registry entry and state; the unique_id stays.
    if (typeof payload.new_entity_id === "string" && payload.new_entity_id !== entry.entity_id) {
      this.moveEntity(entry, payload.new_entity_id);
    }

    // Like HA: a disabled entity is not loaded, so it has no state until it is enabled again.
    if (payload.disabled_by !== undefined && payload.disabled_by !== entry.disabled_by) {
      entry.disabled_by = payload.disabled_by as string | null;
      this.setLoaded(entry.entity_id, entry.disabled_by === null);
    }

    // HA merges the categories per scope; null removes a scope's category.
    if (payload.categories && typeof payload.categories === "object") {
      for (const [scope, id] of Object.entries(payload.categories as Payload)) {
        if (id === null) delete entry.categories[scope];
        else entry.categories[scope] = text(id);
      }
    }

    if (payload.name !== undefined) {
      const state = this.states.get(entry.entity_id);
      const name = (payload.name as string | null) ?? entry.original_name ?? entry.entity_id;

      if (state) state.attributes.friendly_name = name;
    }

    this.emit("entity_registry_updated", { action: "update", entity_id: entry.entity_id });

    return structuredClone(entry);
  }

  private moveEntity(entry: HaEntityRegistryEntry, next: string): void {
    if (this.registry.has(next) || this.states.has(next)) {
      throw new HaCommandError(ERROR_CODE.invalid, "Entity with this ID is already registered");
    }

    const previous = entry.entity_id;
    this.registry.delete(previous);
    entry.entity_id = next;
    this.registry.set(next, entry);

    const state = this.states.get(previous);
    if (state) {
      this.states.delete(previous);
      const moved = { ...state, entity_id: next };
      this.states.set(next, moved);
      this.emit("state_changed", { entity_id: previous, old_state: state, new_state: null });
      this.emit("state_changed", { entity_id: next, old_state: null, new_state: moved });
    }
  }

  /** States of disabled entities wait here until they are enabled again. */
  private readonly unloaded = new Map<string, HaState>();

  private setLoaded(entityId: string, isLoaded: boolean): void {
    if (isLoaded) {
      const state = this.unloaded.get(entityId);
      if (!state) return;
      this.unloaded.delete(entityId);
      this.states.set(entityId, state);
      this.emit("state_changed", { entity_id: entityId, old_state: null, new_state: state });
      return;
    }

    const state = this.states.get(entityId);
    if (!state) return;
    this.unloaded.set(entityId, state);
    this.states.delete(entityId);
    this.emit("state_changed", { entity_id: entityId, old_state: state, new_state: null });
  }

  private categoryList(scope: unknown): HaCategory[] {
    const list = this.categories.get(scope as CategoryScope);

    if (!list) throw new HaCommandError(ERROR_CODE.invalid, "Unknown scope");

    return list;
  }

  private ensureCategory(scope: CategoryScope, name: string): HaCategory {
    const list = this.categoryList(scope);
    const existing = list.find((category) => category.name === name);

    if (existing) return existing;

    const category = { category_id: `demo_category_${this.nextId++}`, name, icon: null };
    list.push(category);

    return category;
  }

  private createCategory(payload: Payload): HaCategory {
    const list = this.categoryList(payload.scope);
    const name = text(payload.name).trim();

    if (!name || list.some((category) => category.name === name)) {
      throw new HaCommandError(ERROR_CODE.invalid, `The name "${name}" is already in use`);
    }

    const category = this.ensureCategory(payload.scope as CategoryScope, name);
    this.emit("category_registry_updated", { action: "create", scope: payload.scope });

    return structuredClone(category);
  }

  private renameCategory(payload: Payload): HaCategory {
    const list = this.categoryList(payload.scope);
    const category = list.find((item) => item.category_id === payload.category_id);
    const name = text(payload.name).trim();

    if (!category) throw new HaCommandError(ERROR_CODE.notFound, "Category not found");
    if (list.some((item) => item !== category && item.name === name)) {
      throw new HaCommandError(ERROR_CODE.invalid, `The name "${name}" is already in use`);
    }

    category.name = name;
    this.emit("category_registry_updated", { action: "update", scope: payload.scope });

    return structuredClone(category);
  }

  private deleteCategory(payload: Payload): null {
    const scope = payload.scope as CategoryScope;
    const list = this.categoryList(scope);
    const index = list.findIndex((item) => item.category_id === payload.category_id);

    if (index < 0) throw new HaCommandError(ERROR_CODE.notFound, "Category not found");

    list.splice(index, 1);

    for (const entry of this.registry.values()) {
      if (entry.categories[scope] === payload.category_id) delete entry.categories[scope];
    }

    this.emit("category_registry_updated", { action: "remove", scope });

    return null;
  }

  /** POST scenes.yaml: the scene takes over the new config, like after HA's scene reload. */
  private saveScene(path: string, body: unknown): unknown {
    const id = decodeURIComponent(path.slice(HA_REST_PATH.sceneConfig.length));
    const config = structuredClone(body) as Payload;

    if (typeof config !== "object" || config === null || Array.isArray(config)) {
      throw new HaRestError(HTTP_BAD_REQUEST, "Message malformed: expected a dictionary");
    }

    this.sceneConfigs.set(id, config);
    const entry = [...this.registry.values()].find(
      (item) => domainOf(item.entity_id) === "scene" && item.unique_id === id,
    );
    if (entry) {
      const entities = Object.keys(config.entities ?? {});
      this.setState(entry.entity_id, this.states.get(entry.entity_id)?.state ?? now(), {
        entity_id: entities,
      });
    }

    return { result: "ok" };
  }

  /** `scene.apply`: every device takes its state and attributes, like HA's reproduce_state. */
  private applyScene(payload: Payload): null {
    const data = (payload.service_data ?? {}) as { entities?: Record<string, unknown> };

    for (const [entityId, raw] of Object.entries(data.entities ?? {})) {
      const value = (raw && typeof raw === "object" ? raw : { state: raw }) as Payload;
      const { state, ...attributes } = value;
      this.setState(entityId, typeof state === "string" ? state : "on", attributes);
    }

    return null;
  }

  private callService(payload: Payload): null {
    if (payload.domain === "scene" && payload.service === "apply") return this.applyScene(payload);

    const service = String(payload.service);
    const target = (payload.target ?? {}) as { entity_id?: string | string[] };
    const entityIds = [target.entity_id ?? []].flat();

    for (const entityId of entityIds) {
      const state = this.states.get(entityId);

      if (!state) continue;

      const toggled = state.state === "on" ? "off" : "on";
      const next =
        service === "toggle"
          ? toggled
          : service === "press" || domainOf(entityId) === "scene"
            ? now()
            : STATE_BY_SERVICE[service];

      // "trigger" and "script.turn_on" run something but keep the state, like in HA.
      if (next && !(domainOf(entityId) === "script" && service === "turn_on")) {
        this.setState(entityId, next);
      }
    }

    return null;
  }

  private setState(entityId: string, value: string, attributes: Payload = {}): void {
    const oldState = this.states.get(entityId);

    if (!oldState) return;

    const newState = {
      ...oldState,
      state: value,
      attributes: { ...oldState.attributes, ...attributes },
    };
    this.states.set(entityId, newState);
    this.emit("state_changed", { entity_id: entityId, old_state: oldState, new_state: newState });
  }

  private translations(payload: Payload): Record<string, string> {
    const byLanguage =
      this.home.translations[String(payload.language)] ??
      this.home.translations[FALLBACK_LANGUAGE] ??
      {};

    return structuredClone(byLanguage[String(payload.category)] ?? {});
  }

  private flowConfigOf(kind: FlowKind, entityId: string): Payload {
    const entry = this.requireEntity(entityId);
    const config = this.flowConfigs.get(kind)?.get(entry.unique_id);

    if (!config) throw new HaCommandError(ERROR_CODE.notFound, "Config not found");

    return structuredClone(config);
  }

  /** `input_boolean/create`, `counter/delete`, …: HA-managed helpers. */
  private helperCommand(type: string, payload: Payload): unknown {
    const match = HELPER_COMMAND.exec(type);
    const helperType = match?.[1] ?? "";

    if (!match || !HELPER_DOMAINS.has(helperType)) {
      throw new HaCommandError(ERROR_CODE.unknownCommand, `Unknown command ${type}`);
    }

    if (match[2] === "list") return this.listHelpers(helperType);
    if (match[2] === "update") return this.updateHelper(helperType, payload);

    if (match[2] === "delete") {
      const helperId = String(payload[`${helperType}_id`]);
      const entry = [...this.registry.values()].find(
        (item) => item.platform === helperType && item.unique_id === helperId,
      );

      if (!entry) throw new HaCommandError(ERROR_CODE.notFound, "Helper not found");

      this.removeEntity(entry.entity_id);

      return null;
    }

    const name = text(payload.name).trim();
    const helperId = slugify(name);
    const entityId = this.freeEntityId(helperType, helperId);

    this.addEntity({
      entityId,
      name,
      state: helperType === "input_boolean" ? "off" : "unknown",
      platform: helperType,
      uniqueId: entityId.split(DOMAIN_SEPARATOR)[1],
      icon: typeof payload.icon === "string" ? payload.icon : undefined,
    });
    this.emit("entity_registry_updated", { action: "create", entity_id: entityId });

    const id = entityId.split(DOMAIN_SEPARATOR)[1];
    this.helperItems.set(`${helperType}.${id}`, { ...payload });

    return { id, ...payload };
  }

  /** `<type>/list`: every stored helper of the type with its settings. */
  private listHelpers(type: string): Payload[] {
    return [...this.registry.values()]
      .filter((entry) => entry.platform === type)
      .map((entry) => ({ id: entry.unique_id, ...this.storedHelper(type, entry) }));
  }

  /** `<type>/update`: replaces the stored helper, like HA; the state takes over the settings. */
  private updateHelper(type: string, payload: Payload): Payload {
    const idField = `${type}_id`;
    const id = String(payload[idField]);
    const entry = [...this.registry.values()].find(
      (item) => item.platform === type && item.unique_id === id,
    );

    if (!entry) throw new HaCommandError(ERROR_CODE.notFound, "Helper not found");

    const item = Object.fromEntries(Object.entries(payload).filter(([key]) => key !== idField));
    this.helperItems.set(`${type}.${id}`, item);

    const settings = Object.fromEntries(
      (HELPER_SETTING_ATTRIBUTES[type] ?? []).map((key) => [key, item[key]]),
    );
    this.setState(entry.entity_id, this.states.get(entry.entity_id)?.state ?? "unknown", settings);

    return { id, ...item };
  }

  private storedHelper(type: string, entry: HaEntityRegistryEntry): Payload {
    const stored = this.helperItems.get(`${type}.${entry.unique_id}`);
    if (stored) return structuredClone(stored);

    const attributes: Payload = { ...this.states.get(entry.entity_id)?.attributes };
    const fromState = Object.fromEntries(
      (HELPER_SETTING_ATTRIBUTES[type] ?? [])
        .filter((key) => attributes[key] !== undefined)
        .map((key) => [key, attributes[key]]),
    );

    return {
      name: entry.original_name ?? entry.entity_id,
      ...(entry.icon ? { icon: entry.icon } : {}),
      ...structuredClone(HELPER_DEFAULTS[type] ?? {}),
      ...structuredClone(fromState),
    };
  }

  private parseFlowPath(path: string): { kind: FlowKind; key: string } {
    for (const kind of ["automation", "script"] as const) {
      const prefix =
        kind === "automation" ? HA_REST_PATH.automationConfig : HA_REST_PATH.scriptConfig;

      if (path.startsWith(prefix)) {
        return { kind, key: decodeURIComponent(path.slice(prefix.length)) };
      }
    }

    throw new HaRestError(HTTP_NOT_FOUND, "Resource not found");
  }

  private emit(eventType: string, data: Payload): void {
    const handlers = this.handlers.get(eventType) ?? [];

    if (handlers.length === 0) return;

    setTimeout(() => {
      for (const handler of handlers) handler({ event_type: eventType, data });
    }, DEMO_EVENT_DELAY_MS);
  }
}
