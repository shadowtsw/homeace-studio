import { Inject, Injectable, NotFoundException } from "@nestjs/common";

import { apiError } from "../common/api/api-response";
import { EDITOR_REPOSITORY } from "../editor/editor.constants";
import { FLOW_KIND } from "../editor/editor.model";
import { EditorService } from "../editor/editor.service";
import { FlowsService } from "../editor/flows.service";
import type { EditorRepository } from "../editor/repositories/editor.repository";
import { EntriesService } from "../entries/entries.service";
import { ENTRY_ACTION, type Entry } from "../entries/entry.model";
import { HELPER_TYPES } from "../helpers/helpers.constants";
import { HelpersService } from "../helpers/helpers.service";
import { MESSAGE_ID } from "../messages/message-ids";

const DOMAIN_SEPARATOR = ".";

/**
 * Copies an automation, script or storage helper with what HA's own "duplicate" leaves out: folder,
 * labels and area. An automation copy starts switched off, so original and copy do not both react
 * to the same triggers; a helper copy keeps its settings and starts with a fresh value.
 */
@Injectable()
export class DuplicateService {
  constructor(
    private readonly flows: FlowsService,
    private readonly flowEditor: EditorService,
    private readonly entries: EntriesService,
    private readonly helpers: HelpersService,
    @Inject(EDITOR_REPOSITORY) private readonly editor: EditorRepository,
  ) {}

  /**
   * @param name - Name of the copy, e.g. "Terrace light (Kopie)"; the UI words it in its language.
   * @throws BadRequestException `FLOW_UNSUPPORTED` / `FLOW_NOT_EDITABLE` like the flow editor.
   */
  async duplicate(entityId: string, name: string): Promise<{ entityId: string }> {
    if (HELPER_TYPES.some((type) => entityId.startsWith(type + DOMAIN_SEPARATOR))) {
      return this.duplicateHelper(entityId, name);
    }

    const { kind, key } = await this.flowEditor.requireStoredFlow(entityId);
    const source = await this.editor.loadStoredConfig(kind, key);
    const entry = (await this.entries.findAll()).find((item) => item.entityId === entityId);

    if (!source || !entry) {
      throw new NotFoundException(apiError(MESSAGE_ID.entryNotFound, { params: { entityId } }));
    }

    const created = await this.flows.create(
      { kind, name, categoryPath: entry.categoryPath ?? undefined },
      source,
    );

    await this.entries.update(created.entityId, {
      labelIds: entry.labels.map((label) => label.labelId),
      areaId: entry.area?.areaId ?? null,
    });
    if (kind === FLOW_KIND.automation) {
      await this.entries.runAction(created.entityId, ENTRY_ACTION.turnOff);
    }

    return created;
  }

  /**
   * @throws BadRequestException `HELPER_NOT_EDITABLE` for config-entry helpers (template, group …).
   */
  private async duplicateHelper(entityId: string, name: string): Promise<{ entityId: string }> {
    const entry = await this.requireEntry(entityId);
    const copyId = await this.helpers.copy(entityId, name, entry.categoryPath);

    await this.entries.update(copyId, {
      labelIds: entry.labels.map((label) => label.labelId),
      areaId: entry.area?.areaId ?? null,
    });

    return { entityId: copyId };
  }

  private async requireEntry(entityId: string): Promise<Entry> {
    const entry = (await this.entries.findAll()).find((item) => item.entityId === entityId);

    if (!entry) {
      throw new NotFoundException(apiError(MESSAGE_ID.entryNotFound, { params: { entityId } }));
    }

    return entry;
  }
}
