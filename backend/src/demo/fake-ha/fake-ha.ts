import { HaCommandError } from "../../ha/ha-command.error";
import { HA_COMMAND, HA_REST_PATH } from "../../ha/ha.constants";
import type { DemoHome } from "../demo-home";
import { createArea, deleteArea, updateArea } from "./areas";
import { categoryList, createCategory, deleteCategory, renameCategory } from "./categories";
import { createData, type FakeHaData } from "./data";
import { deleteFlow, flowConfigOf, getTrace, listTraces, readFlow, saveFlow } from "./flows";
import { helperCommand } from "./helpers";
import { createLabel, deleteLabel, updateLabel } from "./labels";
import { addEntity, requireEntity, updateEntity } from "./registry";
import { readScene, saveScene } from "./scenes";
import { callService } from "./services";
import { ERROR_CODE, type EventHandler, type Payload } from "./shared";

const FALLBACK_LANGUAGE = "en";

export type CallOptions = {
  type: string;
  payload?: Payload;
};

export type SubscribeOptions = {
  eventType: string;
  handler: EventHandler;
};

export type RestPostOptions = {
  path: string;
  body: unknown;
};

/**
 * A small Home Assistant in memory for demo mode.
 *
 * Answers the WebSocket commands and REST calls HomeAce Studio uses, with HA's shapes and the
 * same rules where they matter (one category list per scope, duplicate names refused, saving a new
 * automation registers its entity). Changes fire HA's events, so live updates work as well.
 * This class only routes; one module per topic next to it does the work on the shared data.
 */
export class FakeHa {
  private readonly ha: FakeHaData;
  /** The unit HA shows temperatures in (its general settings); tests switch it to °F. */
  temperatureUnit = "°C";

  constructor(home: DemoHome) {
    this.ha = createData(home);

    for (const entity of home.entities) addEntity({ ha: this.ha, entity });
    this.ha.isSeeded = true;
  }

  /** Answers one WebSocket command like HA would, or throws {@link HaCommandError}. */
  call({ type, payload = {} }: CallOptions): unknown {
    const { ha } = this;

    switch (type) {
      case HA_COMMAND.getStates:
        return structuredClone([...ha.states.values()]);
      case HA_COMMAND.entityRegistryList:
        return structuredClone([...ha.registry.values()]);
      case HA_COMMAND.entityRegistryGet:
        return structuredClone(requireEntity({ ha, entityId: String(payload.entity_id) }));
      case HA_COMMAND.entityRegistryUpdate:
        return updateEntity({ ha, payload });
      case HA_COMMAND.categoryRegistryList:
        return structuredClone(categoryList({ ha, scope: payload.scope }));
      case HA_COMMAND.categoryRegistryCreate:
        return createCategory({ ha, payload });
      case HA_COMMAND.categoryRegistryUpdate:
        return renameCategory({ ha, payload });
      case HA_COMMAND.categoryRegistryDelete:
        return deleteCategory({ ha, payload });
      case HA_COMMAND.labelRegistryList:
        return structuredClone(ha.labels);
      case HA_COMMAND.labelRegistryCreate:
        return createLabel({ ha, payload });
      case HA_COMMAND.labelRegistryUpdate:
        return updateLabel({ ha, payload });
      case HA_COMMAND.labelRegistryDelete:
        return deleteLabel({ ha, payload });
      case HA_COMMAND.deviceRegistryList:
        return structuredClone([...ha.devices.values()]);
      case HA_COMMAND.areaRegistryList:
        return structuredClone(ha.areas);
      case HA_COMMAND.floorRegistryList:
        return structuredClone(ha.home.floors);
      // A card, no icon pack: the demo runs outside HA, where packs cannot load anyway
      case HA_COMMAND.lovelaceResources:
        return [{ id: "1", type: "module", url: "/local/community/lovelace-mushroom/mushroom.js" }];
      case HA_COMMAND.traceList:
        return listTraces({ ha, payload });
      case HA_COMMAND.traceGet:
        return getTrace({ ha, payload });
      case HA_COMMAND.areaRegistryCreate:
        return createArea({ ha, payload });
      case HA_COMMAND.areaRegistryUpdate:
        return updateArea({ ha, payload });
      case HA_COMMAND.areaRegistryDelete:
        return deleteArea({ ha, payload });
      case HA_COMMAND.configEntriesGet:
        return structuredClone(ha.home.helperConfigEntries);
      case HA_COMMAND.manifestList:
        return structuredClone(ha.home.integrations);
      case HA_COMMAND.callService:
        return callService({ ha, payload });
      case HA_COMMAND.getServices:
        return structuredClone(ha.home.services);
      case HA_COMMAND.getTranslations:
        return { resources: this.translations(payload) };
      case HA_COMMAND.automationConfig:
        return {
          config: flowConfigOf({ ha, kind: "automation", entityId: String(payload.entity_id) }),
        };
      case HA_COMMAND.scriptConfig:
        return {
          config: flowConfigOf({ ha, kind: "script", entityId: String(payload.entity_id) }),
        };
      case HA_COMMAND.getConfig:
        return { unit_system: { temperature: this.temperatureUnit } };
      case HA_COMMAND.unsubscribeEvents:
        return null;
      default:
        return helperCommand({ ha, type, payload });
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

  subscribe({ eventType, handler }: SubscribeOptions): void {
    this.ha.handlers.set(eventType, [...(this.ha.handlers.get(eventType) ?? []), handler]);
  }

  /** REST GET below `/api`; null for unknown resources, like HA's 404. */
  restGet(path: string): unknown {
    if (path.startsWith(HA_REST_PATH.sceneConfig)) return readScene({ ha: this.ha, path });
    return readFlow({ ha: this.ha, path });
  }

  /** REST POST below `/api`: saves a scene, automation or script; a new key creates its entity. */
  restPost({ path, body }: RestPostOptions): unknown {
    if (path.startsWith(HA_REST_PATH.sceneConfig)) return saveScene({ ha: this.ha, path, body });
    return saveFlow({ ha: this.ha, path, body });
  }

  /** REST DELETE below `/api`: removes an automation or script and its entity. */
  restDelete(path: string): void {
    deleteFlow({ ha: this.ha, path });
  }

  private translations(payload: Payload): Record<string, string> {
    const byLanguage =
      this.ha.home.translations[String(payload.language)] ??
      this.ha.home.translations[FALLBACK_LANGUAGE] ??
      {};

    return structuredClone(byLanguage[String(payload.category)] ?? {});
  }
}
