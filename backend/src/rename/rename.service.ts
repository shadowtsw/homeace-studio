import { BadRequestException, ConflictException, Inject, Injectable } from "@nestjs/common";

import { apiError } from "../common/api/api-response";
import { EDITOR_REPOSITORY } from "../editor/editor.constants";
import { EditorService } from "../editor/editor.service";
import type { EditorRepository } from "../editor/repositories/editor.repository";
import { EntriesService } from "../entries/entries.service";
import { renameSortingEntity } from "../entity-sorting/sorting-memory";
import { HaConnectionService } from "../ha/ha-connection.service";
import { HA_COMMAND } from "../ha/ha.constants";
import { MESSAGE_ID } from "../messages/message-ids";
import { OVERLAY_REPOSITORY } from "../overlay/overlay.constants";
import type { Overlay } from "../overlay/overlay.model";
import type { OverlayRepository } from "../overlay/repositories/overlay.repository";
import { HomeSnapshotService } from "../snapshot/home-snapshot.service";
import { countEntityId, ENTITY_ID_PATTERN, replaceEntityId } from "./entity-id";

/** A flow, scene or group that names the entity, and how often. */
export type EntityReference = {
  entityId: string;
  name: string;
  /** "automation", "script", "scene" or "group". */
  kind: string;
  count: number;
  /** In automations.yaml / scripts.yaml, so HomeAce Studio can rewrite it. */
  isEditable: boolean;
};

export type RenameResult = {
  entityId: string;
  /** Flows rewritten with the new ID. */
  updated: EntityReference[];
  /** Places that still name the old ID: not editable here, or "Verweise" was unticked. */
  skipped: EntityReference[];
};

const FLOW_KINDS = ["automation", "script"];

export type RenameOptions = {
  entityId: string;
  newEntityId: string;
  withReferences: boolean;
};

/** Changes an entity ID in HA and, if wanted, in every flow that names it (docs/api.md). */
@Injectable()
export class RenameService {
  constructor(
    private readonly ha: HaConnectionService,
    private readonly entries: EntriesService,
    private readonly snapshots: HomeSnapshotService,
    private readonly flows: EditorService,
    @Inject(EDITOR_REPOSITORY) private readonly editor: EditorRepository,
    @Inject(OVERLAY_REPOSITORY) private readonly overlay: OverlayRepository,
  ) {}

  /** Where the entity ID appears: flows (with their count) and the members of scenes and groups. */
  async references(entityId: string): Promise<EntityReference[]> {
    const snapshot = await this.snapshots.get();
    const names = new Map(snapshot.entries.map((entry) => [entry.entityId, entry.name]));
    const references: EntityReference[] = [];

    for (const [flowId, config] of snapshot.configs) {
      if (flowId === entityId) continue;
      const count = countEntityId({ value: config, entityId });
      if (count === 0) continue;

      references.push({
        entityId: flowId,
        name: names.get(flowId) ?? flowId,
        kind: flowId.split(".")[0] ?? "",
        count,
        isEditable: await this.isEditable(flowId),
      });
    }

    // Scenes and groups list their members in the state; HomeAce Studio does not write them yet.
    for (const state of snapshot.states) {
      const kind = state.entity_id.split(".")[0] ?? "";
      const members = state.attributes.entity_id;
      if (FLOW_KINDS.includes(kind) || !/^(scene|group)$/.test(kind)) continue;
      if (!Array.isArray(members) || !members.includes(entityId)) continue;

      references.push({
        entityId: state.entity_id,
        name: names.get(state.entity_id) ?? state.attributes.friendly_name ?? state.entity_id,
        kind,
        count: 1,
        isEditable: false,
      });
    }

    return references.sort((a, b) =>
      a.name.localeCompare(b.name, undefined, { sensitivity: "base" }),
    );
  }

  /**
   * Renames the entity in HA's registry (HA moves history and statistics along), carries favorite,
   * note and ignored findings over, and rewrites the flows that name it when wanted.
   *
   * @throws BadRequestException `ENTRY_ID_INVALID` for another domain or a malformed ID.
   * @throws ConflictException `ENTRY_ID_TAKEN` when HA already has the new ID.
   */
  async rename({ entityId, newEntityId, withReferences }: RenameOptions): Promise<RenameResult> {
    const domain = entityId.split(".")[0];
    if (!ENTITY_ID_PATTERN.test(newEntityId) || newEntityId.split(".")[0] !== domain) {
      throw new BadRequestException(
        apiError({
          message: MESSAGE_ID.entryIdInvalid,
          details: { params: { entityId: newEntityId } },
        }),
      );
    }
    if (newEntityId === entityId) return { entityId, updated: [], skipped: [] };

    // Name, icon and so on need a registry entry; the same check guards the rename.
    await this.entries.details(entityId);
    const snapshot = await this.snapshots.get();
    const taken =
      snapshot.states.some((state) => state.entity_id === newEntityId) ||
      snapshot.registry.some((entry) => entry.entity_id === newEntityId);
    if (taken) {
      throw new ConflictException(
        apiError({
          message: MESSAGE_ID.entryIdTaken,
          details: { params: { entityId: newEntityId } },
        }),
      );
    }

    const references = await this.references(entityId);

    await this.ha.call(HA_COMMAND.entityRegistryUpdate, {
      entity_id: entityId,
      new_entity_id: newEntityId,
    });
    await this.overlay.update((current) =>
      carryOver({ overlay: current, from: entityId, to: newEntityId }),
    );

    const updated: EntityReference[] = [];
    const skipped: EntityReference[] = [];

    for (const reference of references) {
      if (!withReferences || !reference.isEditable) {
        skipped.push(reference);
        continue;
      }

      const { kind, key } = await this.flows.requireStoredFlow(reference.entityId);
      const stored = await this.editor.loadStoredConfig(kind, key);
      if (!stored) {
        skipped.push(reference);
        continue;
      }

      const next = replaceEntityId({ value: stored, from: entityId, to: newEntityId }) as Record<
        string,
        unknown
      >;
      await this.editor.saveConfig(kind, key, next);
      updated.push(reference);
    }

    this.snapshots.invalidate();
    return { entityId: newEntityId, updated, skipped };
  }

  private async isEditable(flowId: string): Promise<boolean> {
    try {
      await this.flows.requireStoredFlow(flowId);
      return true;
    } catch {
      return false;
    }
  }
}

/** Favorite, note and hidden findings belong to the entity, so they move to the new ID. */
function carryOver({ overlay, from, to }: { overlay: Overlay; from: string; to: string }): Overlay {
  const notes = { ...overlay.notes };
  const note = notes[from];
  delete notes[from];
  if (note !== undefined) notes[to] = note;

  return {
    ...overlay,
    favorites: overlay.favorites.map((id) => (id === from ? to : id)),
    notes,
    checkupIgnored: overlay.checkupIgnored.map(
      (key) => replaceEntityId({ value: key, from, to }) as string,
    ),
    entitySorting: renameSortingEntity({ memory: overlay.entitySorting, from, to }),
  };
}
