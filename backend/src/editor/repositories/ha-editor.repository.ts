import { Injectable } from "@nestjs/common";

import { HaConnectionService } from "../../ha/ha-connection.service";
import { HaRestService } from "../../ha/ha-rest.service";
import { HA_COMMAND, HA_REST_PATH } from "../../ha/ha.constants";
import type { HaEntityRegistryEntry, HaState } from "../../ha/ha.types";
import type {
  CatalogSources,
  HaPlatformDescription,
  HaServices,
  HaTranslations,
} from "../catalog.mapper";
import { FLOW_KIND, type FlowKind } from "../editor.model";
import type { EditorRepository } from "./editor.repository";

const TRANSLATION_CATEGORY = {
  triggers: "triggers",
  conditions: "conditions",
  services: "services",
} as const;

const CONFIG_COMMAND: Record<FlowKind, string> = {
  [FLOW_KIND.automation]: HA_COMMAND.automationConfig,
  [FLOW_KIND.script]: HA_COMMAND.scriptConfig,
};

const REST_PATH: Record<FlowKind, string> = {
  [FLOW_KIND.automation]: HA_REST_PATH.automationConfig,
  [FLOW_KIND.script]: HA_REST_PATH.scriptConfig,
};

@Injectable()
export class HaEditorRepository implements EditorRepository {
  constructor(
    private readonly ha: HaConnectionService,
    private readonly rest: HaRestService,
  ) {}

  async loadCatalogSources(language: string): Promise<CatalogSources> {
    const [triggers, conditions, services, triggerTexts, conditionTexts, serviceTexts] =
      await Promise.all([
        this.ha.snapshot<Record<string, HaPlatformDescription>>(
          HA_COMMAND.triggerPlatformsSubscribe,
        ),
        this.ha.snapshot<Record<string, HaPlatformDescription>>(
          HA_COMMAND.conditionPlatformsSubscribe,
        ),
        this.ha.call<HaServices>(HA_COMMAND.getServices),
        this.loadTranslations({ language, category: TRANSLATION_CATEGORY.triggers }),
        this.loadTranslations({ language, category: TRANSLATION_CATEGORY.conditions }),
        this.loadTranslations({ language, category: TRANSLATION_CATEGORY.services }),
      ]);

    return {
      triggers,
      conditions,
      services,
      translations: { triggers: triggerTexts, conditions: conditionTexts, services: serviceTexts },
    };
  }

  async loadConfig(kind: FlowKind, entityId: string): Promise<Record<string, unknown>> {
    const result = await this.ha.call<{ config: Record<string, unknown> }>(CONFIG_COMMAND[kind], {
      entity_id: entityId,
    });

    return result.config;
  }

  loadStates(): Promise<HaState[]> {
    return this.ha.call<HaState[]>(HA_COMMAND.getStates);
  }

  async loadStorageKey(
    kind: FlowKind,
    entityId: string,
    config: Record<string, unknown>,
  ): Promise<string | null> {
    if (kind === FLOW_KIND.automation) {
      return typeof config.id === "string" && config.id !== "" ? config.id : null;
    }

    // A script's unique ID is its key in scripts.yaml.
    try {
      const registration = await this.ha.call<HaEntityRegistryEntry>(HA_COMMAND.entityRegistryGet, {
        entity_id: entityId,
      });
      return registration.unique_id || null;
    } catch {
      return null;
    }
  }

  loadStoredConfig(kind: FlowKind, key: string): Promise<Record<string, unknown> | null> {
    return this.rest.get<Record<string, unknown>>(REST_PATH[kind] + encodeURIComponent(key));
  }

  async saveConfig(kind: FlowKind, key: string, config: Record<string, unknown>): Promise<void> {
    await this.rest.post(REST_PATH[kind] + encodeURIComponent(key), config);
  }

  deleteConfig(kind: FlowKind, key: string): Promise<void> {
    return this.rest.delete(REST_PATH[kind] + encodeURIComponent(key));
  }

  async findEntityId(kind: FlowKind, key: string): Promise<string | null> {
    const entries = await this.ha.call<HaEntityRegistryEntry[]>(HA_COMMAND.entityRegistryList);
    // Automations and scripts are their own platform; the storage key is the unique_id.
    const match = entries.find((entry) => entry.platform === kind && entry.unique_id === key);

    return match?.entity_id ?? null;
  }

  async loadCategoryId(kind: FlowKind, entityId: string): Promise<string | null> {
    try {
      const entry = await this.ha.call<HaEntityRegistryEntry>(HA_COMMAND.entityRegistryGet, {
        entity_id: entityId,
      });
      return entry.categories[kind] ?? null;
    } catch {
      return null;
    }
  }

  private async loadTranslations({
    language,
    category,
  }: {
    language: string;
    category: string;
  }): Promise<HaTranslations> {
    const result = await this.ha.call<{ resources: HaTranslations }>(HA_COMMAND.getTranslations, {
      language,
      category,
    });

    return result.resources;
  }
}
