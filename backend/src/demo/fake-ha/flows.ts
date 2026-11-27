import { HaCommandError } from "../../ha/ha-command.error";
import { HaRestError } from "../../ha/ha-rest.service";
import { HA_REST_PATH } from "../../ha/ha.constants";
import type { DemoTrace } from "../demo-traces";
import { emit, setState, type FakeHaData } from "./data";
import { addEntity, freeEntityId, removeEntity, requireEntity } from "./registry";
import {
  ERROR_CODE,
  HTTP_BAD_REQUEST,
  HTTP_NOT_FOUND,
  slugify,
  type FlowKind,
  type Payload,
} from "./shared";

function parseFlowPath(path: string): { kind: FlowKind; key: string } {
  for (const kind of ["automation", "script"] as const) {
    const prefix =
      kind === "automation" ? HA_REST_PATH.automationConfig : HA_REST_PATH.scriptConfig;

    if (path.startsWith(prefix)) {
      return { kind, key: decodeURIComponent(path.slice(prefix.length)) };
    }
  }

  throw new HaRestError(HTTP_NOT_FOUND, "Resource not found");
}

/** REST GET of an automation's or script's config; null when there is none, like HA's 404. */
export function readFlow({ ha, path }: { ha: FakeHaData; path: string }): unknown {
  const { kind, key } = parseFlowPath(path);
  const config = ha.flowConfigs.get(kind)?.get(key);

  return config ? structuredClone(config) : null;
}

/** REST POST: saves an automation or script; a new key creates its entity. */
export function saveFlow({
  ha,
  path,
  body,
}: {
  ha: FakeHaData;
  path: string;
  body: unknown;
}): unknown {
  const { kind, key } = parseFlowPath(path);
  const config = structuredClone(body) as Payload;

  if (typeof config !== "object" || config === null || Array.isArray(config)) {
    throw new HaRestError(HTTP_BAD_REQUEST, "Message malformed: expected a dictionary");
  }

  ha.flowConfigs.get(kind)?.set(key, config);
  const name = typeof config.alias === "string" && config.alias ? config.alias : key;
  const existing = [...ha.registry.values()].find(
    (entry) => entry.platform === kind && entry.unique_id === key,
  );

  if (existing) {
    setState({
      ha,
      entityId: existing.entity_id,
      value: ha.states.get(existing.entity_id)?.state ?? "on",
      attributes: {
        friendly_name: name,
      },
    });
  } else {
    const objectId = kind === "script" ? key : slugify(name);
    addEntity({
      ha,
      entity: {
        entityId: freeEntityId({ ha, domain: kind, objectId }),
        name,
        state: kind === "automation" ? "on" : "off",
        platform: kind,
        uniqueId: key,
      },
    });
    emit({ ha, eventType: "entity_registry_updated", data: { action: "create" } });
  }

  return { result: "ok" };
}

/** REST DELETE: removes an automation or script and its entity. */
export function deleteFlow({ ha, path }: { ha: FakeHaData; path: string }): void {
  const { kind, key } = parseFlowPath(path);
  const configs = ha.flowConfigs.get(kind);

  if (!configs?.has(key)) throw new HaRestError(HTTP_NOT_FOUND, "Resource not found");

  configs.delete(key);
  const entry = [...ha.registry.values()].find(
    (item) => item.platform === kind && item.unique_id === key,
  );

  if (entry) removeEntity({ ha, entityId: entry.entity_id });
}

/** The stored config of an automation or script, looked up by its entity. */
export function flowConfigOf({
  ha,
  kind,
  entityId,
}: {
  ha: FakeHaData;
  kind: FlowKind;
  entityId: string;
}): Payload {
  const entry = requireEntity({ ha, entityId });
  const config = ha.flowConfigs.get(kind)?.get(entry.unique_id);

  if (!config) throw new HaCommandError(ERROR_CODE.notFound, "Config not found");

  return structuredClone(config);
}

/** Like HA: summaries without steps and context, of one item or of a whole domain. */
export function listTraces({ ha, payload }: { ha: FakeHaData; payload: Payload }): unknown[] {
  return ha.home.traces
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

export function getTrace({ ha, payload }: { ha: FakeHaData; payload: Payload }): unknown {
  const trace = ha.home.traces.find(
    (item) =>
      item.domain === payload.domain &&
      item.item_id === payload.item_id &&
      item.run_id === payload.run_id,
  );
  if (!trace) throw new HaCommandError(ERROR_CODE.notFound, "The trace could not be found");
  return structuredClone(trace);
}
