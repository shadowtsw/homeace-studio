import { HaRestError } from "../../ha/ha-rest.service";
import { HA_REST_PATH } from "../../ha/ha.constants";
import { emit, setState, type FakeHaData } from "./data";
import { addEntity, freeEntityId } from "./registry";
import { domainOf, HTTP_BAD_REQUEST, now, slugify, type Payload } from "./shared";

function sceneIdOf(path: string): string {
  return decodeURIComponent(path.slice(HA_REST_PATH.sceneConfig.length));
}

/** GET scenes.yaml of one scene; null when there is none, like HA's 404. */
export function readScene({ ha, path }: { ha: FakeHaData; path: string }): unknown {
  const config = ha.sceneConfigs.get(sceneIdOf(path));

  return config ? structuredClone(config) : null;
}

/** POST scenes.yaml: the scene takes over the new config, like after HA's scene reload. */
export function saveScene({
  ha,
  path,
  body,
}: {
  ha: FakeHaData;
  path: string;
  body: unknown;
}): unknown {
  const id = sceneIdOf(path);
  const config = structuredClone(body) as Payload;

  if (typeof config !== "object" || config === null || Array.isArray(config)) {
    throw new HaRestError(HTTP_BAD_REQUEST, "Message malformed: expected a dictionary");
  }

  ha.sceneConfigs.set(id, config);
  const entry = [...ha.registry.values()].find(
    (item) => domainOf(item.entity_id) === "scene" && item.unique_id === id,
  );
  const entities = Object.keys(config.entities ?? {});
  if (entry) {
    setState({
      ha,
      entityId: entry.entity_id,
      value: ha.states.get(entry.entity_id)?.state ?? now(),
      attributes: {
        entity_id: entities,
      },
    });
  } else {
    // A new scene: HA registers it under a slug of its name, never activated yet
    const name = typeof config.name === "string" && config.name ? config.name : id;
    const entityId = freeEntityId({ ha, domain: "scene", objectId: slugify(name) });
    addEntity({
      ha,
      entity: {
        entityId,
        name,
        state: "unknown",
        platform: "homeassistant",
        uniqueId: id,
        attributes: { entity_id: entities },
      },
    });
    emit({
      ha,
      eventType: "entity_registry_updated",
      data: { action: "create", entity_id: entityId },
    });
  }

  return { result: "ok" };
}

/** `scene.apply`: every device takes its state and attributes, like HA's reproduce_state. */
export function applyScene({ ha, payload }: { ha: FakeHaData; payload: Payload }): null {
  const data = (payload.service_data ?? {}) as { entities?: Record<string, unknown> };

  for (const [entityId, raw] of Object.entries(data.entities ?? {})) {
    const value = (raw && typeof raw === "object" ? raw : { state: raw }) as Payload;
    const { state, ...attributes } = value;
    setState({ ha, entityId, value: typeof state === "string" ? state : "on", attributes });
  }

  return null;
}
