import { Inject, Injectable, Logger } from "@nestjs/common";

import { CategoriesService } from "src/categories/categories.service";
import { ENTITY_LOOKUP_WAIT } from "src/common/utils/wait";
import { removeExtras } from "src/entries/entry-extras";
import { OVERLAY_REPOSITORY } from "src/overlay/overlay.constants";
import type { OverlayRepository } from "src/overlay/repositories/overlay.repository";
import { VersionsService } from "src/versions/versions.service";
import type { CreateFlowDto } from "./dto/create-flow.dto";
import {
  EDITOR_REPOSITORY,
  FLOW_CLOCK,
  FLOW_LOOKUP_ATTEMPTS,
  FLOW_LOOKUP_DELAY_MS,
} from "./editor.constants";
import { FLOW_KIND, type FlowKind } from "./editor.model";
import { EditorService } from "./editor.service";
import { toFlowError } from "./flow-errors";
import { firstFreeKey, scriptKeyFor } from "./flow-key";
import type { EditorRepository } from "./repositories/editor.repository";

const DEFAULT_MODE = "single";

/** The fields that make a flow a new one: its id (automations only) and its name. */
function pickIdentity(config: Record<string, unknown>): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(config).filter(([field]) => field === "id" || field === "alias"),
  );
}

type ConfigToCreateOptions = {
  fresh: Record<string, unknown>;
  copyOf: Record<string, unknown> | undefined;
};

/** A copy takes the whole flow; only the id (automations) and the name are new. */
function configToCreate({ fresh, copyOf }: ConfigToCreateOptions): Record<string, unknown> {
  if (!copyOf) return fresh;

  return { ...copyOf, ...pickIdentity(fresh) };
}

const ENTITY_ID_SEPARATOR = ".";

export type CreateOptions = {
  dto: CreateFlowDto;
  copyOf?: Record<string, unknown>;
};

/** Creating and deleting whole automations and scripts (the editor service edits them). */
@Injectable()
export class FlowsService {
  private readonly logger = new Logger(FlowsService.name);

  constructor(
    @Inject(EDITOR_REPOSITORY) private readonly editor: EditorRepository,
    private readonly editorService: EditorService,
    private readonly categories: CategoriesService,
    @Inject(OVERLAY_REPOSITORY) private readonly overlay: OverlayRepository,
    @Inject(ENTITY_LOOKUP_WAIT) private readonly pause: (milliseconds: number) => Promise<void>,
    @Inject(FLOW_CLOCK) private readonly now: () => number,
    private readonly versions: VersionsService,
  ) {}

  /**
   * Creates an empty automation (no triggers, so it never runs on its own) or an empty script in
   * HA's file, then sorts it into the folder. The user fills it in the flow editor.
   *
   * @returns The entity ID HA gave the new flow.
   * @throws BadRequestException `FLOW_INVALID` when HA rejects the config.
   */
  async create({ dto, copyOf }: CreateOptions): Promise<{ entityId: string }> {
    const name = dto.name.trim();
    const fresh = await this.newConfig({ kind: dto.kind, name });
    const key = fresh.key;
    const config = configToCreate({ fresh: fresh.config, copyOf });

    await this.editor.saveConfig({ kind: dto.kind, key, config }).catch((error: unknown) => {
      throw toFlowError(error);
    });

    const entityId = await this.waitForEntityId({ kind: dto.kind, key });

    if (!entityId) {
      // The flow exists; only the folder could not be set. HA names it after a slug of the name.
      this.logger.warn(`Entity of new ${dto.kind} "${key}" not found; category not set`);
      return { entityId: dto.kind + ENTITY_ID_SEPARATOR + scriptKeyFor(name) };
    }

    if (dto.categoryPath) {
      await this.categories.assign({
        entityId,
        scope: dto.kind,
        currentCategoryId: null,
        targetPath: dto.categoryPath,
      });
    }

    this.logger.log(`Created ${entityId}`);
    // The first version: "in HomeAce angelegt" (never throws).
    await this.versions.recordSaved({ entityId });

    return { entityId };
  }

  /**
   * Deletes an automation or script from HA's file, then its own extras and its category if that
   * became empty.
   *
   * @throws BadRequestException `FLOW_NOT_EDITABLE` for flows outside automations.yaml /
   *   scripts.yaml (they would have to be removed from their YAML by hand).
   */
  async delete(entityId: string): Promise<void> {
    const { kind, key } = await this.editorService.requireStoredFlow(entityId);
    const categoryId = await this.editor.loadCategoryId({ kind, entityId });

    await this.editor.deleteConfig({ kind, key });
    await this.overlay.update((overlay) => removeExtras({ overlay, entityId }));

    if (categoryId) await this.categories.cleanUp({ scope: kind, categoryId });

    this.logger.log(`Deleted ${entityId}`);
  }

  private async newConfig({
    kind,
    name,
  }: {
    kind: FlowKind;
    name: string;
  }): Promise<{ key: string; config: Record<string, unknown> }> {
    if (kind === FLOW_KIND.automation) {
      // HA's own editor uses the current time in milliseconds as id.
      const id = String(this.now());
      return {
        key: id,
        config: {
          id,
          alias: name,
          description: "",
          triggers: [],
          conditions: [],
          actions: [],
          mode: DEFAULT_MODE,
        },
      };
    }

    const key = await firstFreeKey({
      base: scriptKeyFor(name),
      isTaken: async (candidate) => {
        const [stored, entityId] = await Promise.all([
          this.editor.loadStoredConfig({ kind, key: candidate }),
          this.editor.findEntityId({ kind, key: candidate }),
        ]);
        return stored !== null || entityId !== null;
      },
    });

    return { key, config: { alias: name, sequence: [], mode: DEFAULT_MODE } };
  }

  /** HA registers the entity after reloading its automations or scripts; ask a few times. */
  private async waitForEntityId({
    kind,
    key,
  }: {
    kind: FlowKind;
    key: string;
  }): Promise<string | null> {
    for (let attempt = 0; attempt < FLOW_LOOKUP_ATTEMPTS; attempt++) {
      const entityId = await this.editor.findEntityId({ kind, key });

      if (entityId) return entityId;

      await this.pause(FLOW_LOOKUP_DELAY_MS);
    }

    return null;
  }
}
