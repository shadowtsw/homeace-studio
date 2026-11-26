import { ConflictException, Injectable, NotFoundException } from "@nestjs/common";

import { apiError } from "../common/api/api-response";
import { HaConnectionService } from "../ha/ha-connection.service";
import { HA_COMMAND } from "../ha/ha.constants";
import type { HaLabel } from "../ha/ha.types";
import type { Label } from "../lookups/lookups.controller";
import { MESSAGE_ID } from "../messages/message-ids";
import { HomeSnapshotService } from "../snapshot/home-snapshot.service";
import { labelUsage, type LabelUsage } from "./label-usage";

export type LabelFields = { name?: string; color?: string | null; icon?: string | null };

const toLabel = (label: HaLabel): Label => ({
  labelId: label.label_id,
  name: label.name,
  icon: label.icon,
  color: label.color,
});

export type UpdateOptions = {
  labelId: string;
  fields: LabelFields;
};

/**
 * Creates, changes and deletes labels in HA's label registry, and tells where a label is used
 * before it goes. Names are checked here first (ignoring case, like HA), so the user gets our
 * message instead of HA's English one. Renaming keeps the label's id, so flows keep working.
 */
@Injectable()
export class LabelsService {
  constructor(
    private readonly ha: HaConnectionService,
    private readonly snapshot: HomeSnapshotService,
  ) {}

  async create(fields: LabelFields & { name: string }): Promise<Label> {
    const name = fields.name.trim();
    await this.requireFreeName({ name, ownId: null });

    const created = await this.ha.call<HaLabel>(HA_COMMAND.labelRegistryCreate, {
      name,
      color: fields.color ?? null,
      icon: fields.icon ?? null,
    });
    return toLabel(created);
  }

  async update({ labelId, fields }: UpdateOptions): Promise<Label> {
    await this.requireLabel(labelId);

    // Only what was sent changes; null clears colour or icon
    const payload: Record<string, unknown> = { label_id: labelId };
    if (fields.name !== undefined) {
      payload.name = fields.name.trim();
      await this.requireFreeName({ name: fields.name.trim(), ownId: labelId });
    }
    if (fields.color !== undefined) payload.color = fields.color;
    if (fields.icon !== undefined) payload.icon = fields.icon;

    return toLabel(await this.ha.call<HaLabel>(HA_COMMAND.labelRegistryUpdate, payload));
  }

  /** HA takes the label away from everything that carries it; flows naming it lose that target. */
  async delete(labelId: string): Promise<void> {
    await this.requireLabel(labelId);
    await this.ha.call(HA_COMMAND.labelRegistryDelete, { label_id: labelId });
  }

  /** What deleting the label would touch, for the warning before it goes. */
  async usage(labelId: string): Promise<LabelUsage> {
    await this.requireLabel(labelId);
    return labelUsage({ labelId, sources: await this.snapshot.get() });
  }

  private list(): Promise<HaLabel[]> {
    return this.ha.call<HaLabel[]>(HA_COMMAND.labelRegistryList);
  }

  private async requireLabel(labelId: string): Promise<void> {
    if (!(await this.list()).some((label) => label.label_id === labelId)) {
      throw new NotFoundException(apiError({ message: MESSAGE_ID.labelNotFound }));
    }
  }

  private async requireFreeName({
    name,
    ownId,
  }: {
    name: string;
    ownId: string | null;
  }): Promise<void> {
    const lower = name.toLocaleLowerCase();
    const taken = (await this.list()).some(
      (label) => label.label_id !== ownId && label.name.toLocaleLowerCase() === lower,
    );

    if (taken)
      throw new ConflictException(
        apiError({ message: MESSAGE_ID.labelNameTaken, details: { params: { name } } }),
      );
  }
}
