import { Injectable } from "@nestjs/common";

import { HaCommandError } from "../../ha/ha-command.error";
import { HaConnectionService } from "../../ha/ha-connection.service";
import { HaRestService } from "../../ha/ha-rest.service";
import { HA_COMMAND, HA_ERROR_CODE, HA_REST_PATH } from "../../ha/ha.constants";
import type { HaEntityRegistryEntry, HaState } from "../../ha/ha.types";
import type { SceneValue } from "../scene.model";
import type { SceneRepository } from "./scene.repository";

const SCENE_DOMAIN = "scene";
const APPLY_SERVICE = "apply";

@Injectable()
export class HaSceneRepository implements SceneRepository {
  constructor(
    private readonly ha: HaConnectionService,
    private readonly rest: HaRestService,
  ) {}

  async findStorageId(entityId: string): Promise<string | null> {
    try {
      const entry = await this.ha.call<HaEntityRegistryEntry>(HA_COMMAND.entityRegistryGet, {
        entity_id: entityId,
      });
      return entry.unique_id || null;
    } catch (error) {
      if (error instanceof HaCommandError && error.code === HA_ERROR_CODE.notFound) return null;
      throw error;
    }
  }

  loadConfig(id: string): Promise<Record<string, unknown> | null> {
    return this.rest.get<Record<string, unknown>>(this.path(id));
  }

  async saveConfig(id: string, config: Record<string, unknown>): Promise<void> {
    await this.rest.post(this.path(id), config);
  }

  loadStates(): Promise<HaState[]> {
    return this.ha.call<HaState[]>(HA_COMMAND.getStates);
  }

  async apply(entities: Record<string, SceneValue>): Promise<void> {
    await this.ha.call(HA_COMMAND.callService, {
      domain: SCENE_DOMAIN,
      service: APPLY_SERVICE,
      service_data: { entities },
    });
  }

  private path(id: string): string {
    return HA_REST_PATH.sceneConfig + encodeURIComponent(id);
  }
}
