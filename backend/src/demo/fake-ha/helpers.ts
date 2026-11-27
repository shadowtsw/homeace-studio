import { HELPER_DOMAINS } from "../../entries/entries.constants";
import { HaCommandError } from "../../ha/ha-command.error";
import type { HaEntityRegistryEntry } from "../../ha/ha.types";
import { emit, setState, type FakeHaData } from "./data";
import { addEntity, freeEntityId, removeEntity } from "./registry";
import { DOMAIN_SEPARATOR, ERROR_CODE, slugify, text, type Payload } from "./shared";

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

function storedHelper({
  ha,
  type,
  entry,
}: {
  ha: FakeHaData;
  type: string;
  entry: HaEntityRegistryEntry;
}): Payload {
  const stored = ha.helperItems.get(`${type}.${entry.unique_id}`);
  if (stored) return structuredClone(stored);

  const attributes: Payload = { ...ha.states.get(entry.entity_id)?.attributes };
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

/** `<type>/list`: every stored helper of the type with its settings. */
function listHelpers({ ha, type }: { ha: FakeHaData; type: string }): Payload[] {
  return [...ha.registry.values()]
    .filter((entry) => entry.platform === type)
    .map((entry) => ({ id: entry.unique_id, ...storedHelper({ ha, type, entry }) }));
}

/** `<type>/update`: replaces the stored helper, like HA; the state takes over the settings. */
function updateHelper({
  ha,
  type,
  payload,
}: {
  ha: FakeHaData;
  type: string;
  payload: Payload;
}): Payload {
  const idField = `${type}_id`;
  const id = String(payload[idField]);
  const entry = [...ha.registry.values()].find(
    (item) => item.platform === type && item.unique_id === id,
  );

  if (!entry) throw new HaCommandError(ERROR_CODE.notFound, "Helper not found");

  const item = Object.fromEntries(Object.entries(payload).filter(([key]) => key !== idField));
  ha.helperItems.set(`${type}.${id}`, item);

  const settings = Object.fromEntries(
    (HELPER_SETTING_ATTRIBUTES[type] ?? []).map((key) => [key, item[key]]),
  );
  setState({
    ha,
    entityId: entry.entity_id,
    value: ha.states.get(entry.entity_id)?.state ?? "unknown",
    attributes: settings,
  });

  return { id, ...item };
}

/** `input_boolean/create`, `counter/delete`, …: HA-managed helpers. */
export function helperCommand({
  ha,
  type,
  payload,
}: {
  ha: FakeHaData;
  type: string;
  payload: Payload;
}): unknown {
  const match = HELPER_COMMAND.exec(type);
  const helperType = match?.[1] ?? "";

  if (!match || !HELPER_DOMAINS.has(helperType)) {
    throw new HaCommandError(ERROR_CODE.unknownCommand, `Unknown command ${type}`);
  }

  if (match[2] === "list") return listHelpers({ ha, type: helperType });
  if (match[2] === "update") return updateHelper({ ha, type: helperType, payload });

  if (match[2] === "delete") {
    const helperId = String(payload[`${helperType}_id`]);
    const entry = [...ha.registry.values()].find(
      (item) => item.platform === helperType && item.unique_id === helperId,
    );

    if (!entry) throw new HaCommandError(ERROR_CODE.notFound, "Helper not found");

    removeEntity({ ha, entityId: entry.entity_id });

    return null;
  }

  const name = text(payload.name).trim();
  const helperId = slugify(name);
  const entityId = freeEntityId({ ha, domain: helperType, objectId: helperId });

  addEntity({
    ha,
    entity: {
      entityId,
      name,
      state: helperType === "input_boolean" ? "off" : "unknown",
      platform: helperType,
      uniqueId: entityId.split(DOMAIN_SEPARATOR)[1],
      icon: typeof payload.icon === "string" ? payload.icon : undefined,
    },
  });
  emit({
    ha,
    eventType: "entity_registry_updated",
    data: { action: "create", entity_id: entityId },
  });

  const id = entityId.split(DOMAIN_SEPARATOR)[1];
  ha.helperItems.set(`${helperType}.${id}`, { ...payload });

  return { id, ...payload };
}
