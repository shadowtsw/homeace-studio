import { Injectable } from "@nestjs/common";

import { HaConnectionService } from "../../ha/ha-connection.service";
import { HaRestService } from "../../ha/ha-rest.service";
import { HA_COMMAND, HA_REST_PATH } from "../../ha/ha.constants";
import type { HaEntityRegistryEntry } from "../../ha/ha.types";
import { VERSION_KIND, type VersionKind, type VersionRef } from "../versions.model";
import type { VersionTargetRepository } from "./version-target.repository";

const DOMAIN_SEPARATOR = ".";
/** Scenes from scenes.yaml belong to HA's own integration in the entity registry. */
const SCENE_PLATFORM = "homeassistant";

const REST_PATH: Record<VersionKind, string> = {
  [VERSION_KIND.automation]: HA_REST_PATH.automationConfig,
  [VERSION_KIND.script]: HA_REST_PATH.scriptConfig,
  [VERSION_KIND.scene]: HA_REST_PATH.sceneConfig,
};

/**
 * Finds the storage key through the entity registry: automations and scenes register under their
 * config `id`, scripts under their object ID. The registry entry is HA's link between the entity ID
 * (renamable) and the config (stable).
 */
@Injectable()
export class HaVersionTargetRepository implements VersionTargetRepository {
  constructor(
    private readonly ha: HaConnectionService,
    private readonly rest: HaRestService,
  ) {}

  async resolveRef(entityId: string): Promise<VersionRef | null> {
    const kind = kindOfEntityId(entityId);
    if (!kind) return null;

    try {
      const entry = await this.ha.call<HaEntityRegistryEntry>({
        type: HA_COMMAND.entityRegistryGet,
        payload: { entity_id: entityId },
      });
      return refOf(entry);
    } catch {
      return null;
    }
  }

  async listRefs(): Promise<VersionRef[]> {
    const entries = await this.ha.call<HaEntityRegistryEntry[]>({
      type: HA_COMMAND.entityRegistryList,
    });

    return entries.flatMap((entry) => {
      const ref = refOf(entry);
      return ref ? [ref] : [];
    });
  }

  loadStoredConfig(ref: VersionRef): Promise<Record<string, unknown> | null> {
    return this.rest.get<Record<string, unknown>>(
      REST_PATH[ref.kind] + encodeURIComponent(ref.key),
    );
  }

  async saveStoredConfig({
    ref,
    config,
  }: {
    ref: VersionRef;
    config: Record<string, unknown>;
  }): Promise<void> {
    await this.rest.post({ path: REST_PATH[ref.kind] + encodeURIComponent(ref.key), body: config });
  }
}

function kindOfEntityId(entityId: string): VersionKind | null {
  const domain = entityId.split(DOMAIN_SEPARATOR)[0];
  if (domain === VERSION_KIND.automation) return VERSION_KIND.automation;
  if (domain === VERSION_KIND.script) return VERSION_KIND.script;
  if (domain === VERSION_KIND.scene) return VERSION_KIND.scene;

  return null;
}

/** The ref of a registry entry, or null for entries that keep no versions. */
export function refOf(entry: HaEntityRegistryEntry): VersionRef | null {
  const kind = kindOfEntityId(entry.entity_id);
  if (!kind || !entry.unique_id) return null;
  if (kind === VERSION_KIND.scene && entry.platform !== SCENE_PLATFORM) return null;
  if (kind !== VERSION_KIND.scene && entry.platform !== kind) return null;

  return { kind, key: entry.unique_id, entityId: entry.entity_id };
}
