import { BadRequestException, Inject, Injectable, Logger } from "@nestjs/common";

import { apiError } from "src/common/api/api-response";
import { MESSAGE_ID } from "src/messages/message-ids";
import { buildCatalog } from "./catalog.mapper";
import {
  EDITOR_REPOSITORY,
  CATALOG_CACHE_MS,
  CATALOG_LANGUAGES,
  DEFAULT_CATALOG_LANGUAGE,
} from "./editor.constants";
import { FLOW_KIND, type EditorCatalog, type Flow, type FlowKind } from "./editor.model";
import { collectEntityIds } from "./flow-entities";
import { toFlowError } from "./flow-errors";
import type { EditorRepository } from "./repositories/editor.repository";

type CachedCatalog = { catalog: EditorCatalog; loadedAt: number };

const DOMAIN_SEPARATOR = ".";
const BLUEPRINT_KEY = "use_blueprint";

/** Reads what the visual editor needs: the block catalog and the flow of one entry. */
@Injectable()
export class EditorService {
  private readonly logger = new Logger(EditorService.name);
  private readonly catalogs = new Map<string, CachedCatalog>();

  constructor(@Inject(EDITOR_REPOSITORY) private readonly editor: EditorRepository) {}

  /**
   * The catalog of all trigger, condition and action types in one language. Cached for a while,
   * because it only changes when integrations are added or HA is updated.
   *
   * @param language - One of CATALOG_LANGUAGES; anything else falls back to German.
   */
  async getCatalog(language: string | undefined, now = Date.now()): Promise<EditorCatalog> {
    const supported = CATALOG_LANGUAGES.find((code) => code === language);
    const code = supported ?? DEFAULT_CATALOG_LANGUAGE;
    const cached = this.catalogs.get(code);

    if (cached && now - cached.loadedAt < CATALOG_CACHE_MS) return cached.catalog;

    const catalog = buildCatalog(await this.editor.loadCatalogSources(code));
    this.catalogs.set(code, { catalog, loadedAt: now });
    this.logger.log(`Loaded editor catalog (${code})`);

    return catalog;
  }

  /**
   * The config of an automation or script, with names for every entity it mentions and whether
   * HomeAce Studio can save it.
   *
   * @throws BadRequestException `FLOW_UNSUPPORTED` for anything but automations and scripts.
   */
  async getFlow(entityId: string): Promise<Flow> {
    const kind = requireFlowKind(entityId);
    const config = await this.editor.loadConfig(kind, entityId);
    const storageKey = await this.findStorageKey(kind, entityId, config);

    return this.describe(entityId, kind, config, storageKey !== null);
  }

  /**
   * Writes the whole config of an automation or script back to HA (automations.yaml /
   * scripts.yaml). HA validates it and reloads the flow on its own.
   *
   * @returns The saved flow, as `getFlow` would return it.
   * @throws BadRequestException `FLOW_NOT_EDITABLE` when the flow is not stored in those files
   *   or comes from a blueprint; `FLOW_INVALID` when HA rejects the config.
   */
  async saveFlow(entityId: string, config: Record<string, unknown>): Promise<Flow> {
    const { kind, key: storageKey } = await this.requireStoredFlow(entityId);

    if (isFromBlueprint(config)) {
      throw new BadRequestException(apiError(MESSAGE_ID.flowNotEditable, { params: { entityId } }));
    }

    // The id ties the automation to its entity; it must not change through an edit.
    const toSave = kind === FLOW_KIND.automation ? { ...config, id: storageKey } : config;

    await this.editor.saveConfig(kind, storageKey, toSave).catch((error: unknown) => {
      throw toFlowError(error);
    });

    this.logger.log(`Saved flow of ${entityId}`);

    // HA reloads the flow in the background, so reading it back right away could still return
    // the old version; the saved config is what HA runs once the reload is done.
    return this.describe(entityId, kind, toSave, true);
  }

  /**
   * Kind and storage key of a flow HomeAce Studio may write or delete.
   *
   * @throws BadRequestException `FLOW_UNSUPPORTED` for other entries, `FLOW_NOT_EDITABLE` for flows
   *   outside automations.yaml / scripts.yaml or from a blueprint.
   */
  async requireStoredFlow(entityId: string): Promise<{ kind: FlowKind; key: string }> {
    const kind = requireFlowKind(entityId);
    const current = await this.editor.loadConfig(kind, entityId);
    const key = await this.findStorageKey(kind, entityId, current);

    if (key === null) {
      throw new BadRequestException(apiError(MESSAGE_ID.flowNotEditable, { params: { entityId } }));
    }

    return { kind, key };
  }

  /** The storage key when the flow can be written, otherwise null. */
  private async findStorageKey(
    kind: FlowKind,
    entityId: string,
    config: Record<string, unknown>,
  ): Promise<string | null> {
    if (isFromBlueprint(config)) return null;

    const key = await this.editor.loadStorageKey(kind, entityId, config);

    if (key === null) return null;

    const stored = await this.editor.loadStoredConfig(kind, key);

    return stored === null ? null : key;
  }

  private async describe(
    entityId: string,
    kind: FlowKind,
    config: Record<string, unknown>,
    isEditable: boolean,
  ): Promise<Flow> {
    const states = await this.editor.loadStates();
    const statesById = new Map(states.map((state) => [state.entity_id, state]));
    const mentioned = collectEntityIds(config, new Set(statesById.keys()));
    const entityNames = Object.fromEntries(
      mentioned.map((id) => [id, statesById.get(id)?.attributes.friendly_name ?? id]),
    );

    return { entityId, kind, config, entityNames, isEditable };
  }
}

/** @throws BadRequestException `FLOW_UNSUPPORTED` for anything but automations and scripts. */
export function requireFlowKind(entityId: string): FlowKind {
  const domain = entityId.split(DOMAIN_SEPARATOR)[0];

  if (domain === FLOW_KIND.automation) return FLOW_KIND.automation;
  if (domain === FLOW_KIND.script) return FLOW_KIND.script;

  throw new BadRequestException(apiError(MESSAGE_ID.flowUnsupported, { params: { entityId } }));
}

/** Blueprint automations only hold inputs; the blueprint editor (step 7) will handle them. */
function isFromBlueprint(config: Record<string, unknown>): boolean {
  return BLUEPRINT_KEY in config;
}
