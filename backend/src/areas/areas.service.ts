import { ConflictException, Injectable, NotFoundException } from "@nestjs/common";

import { apiError } from "../common/api/api-response";
import { HaConnectionService } from "../ha/ha-connection.service";
import { HA_COMMAND } from "../ha/ha.constants";
import type { HaArea } from "../ha/ha.types";
import type { Area } from "../lookups/lookups.controller";
import { MESSAGE_ID } from "../messages/message-ids";

export type AreaChanges = { name?: string; icon?: string | null };

const toArea = (area: HaArea): Area => ({ areaId: area.area_id, name: area.name, icon: area.icon });

export type CreateOptions = {
  name: string;
  icon: string | null;
};

export type UpdateOptions = {
  areaId: string;
  changes: AreaChanges;
};

/**
 * Creates, changes and deletes areas in HA's area registry. Names are checked here first (ignoring
 * case, like HA), so the user gets our message instead of HA's English one.
 */
@Injectable()
export class AreasService {
  constructor(private readonly ha: HaConnectionService) {}

  async create({ name, icon }: CreateOptions): Promise<Area> {
    const trimmed = name.trim();
    await this.requireFreeName({ name: trimmed, ownId: null });

    const created = await this.ha.call<HaArea>(HA_COMMAND.areaRegistryCreate, {
      name: trimmed,
      icon,
    });
    return toArea(created);
  }

  async update({ areaId, changes }: UpdateOptions): Promise<Area> {
    await this.requireArea(areaId);

    const payload: Record<string, unknown> = { area_id: areaId };
    if (changes.name !== undefined) {
      payload.name = changes.name.trim();
      await this.requireFreeName({ name: changes.name.trim(), ownId: areaId });
    }
    if (changes.icon !== undefined) payload.icon = changes.icon;

    return toArea(await this.ha.call<HaArea>(HA_COMMAND.areaRegistryUpdate, payload));
  }

  /** HA takes the area away from its devices and entities; they stay. */
  async delete(areaId: string): Promise<void> {
    await this.requireArea(areaId);
    await this.ha.call(HA_COMMAND.areaRegistryDelete, { area_id: areaId });
  }

  private list(): Promise<HaArea[]> {
    return this.ha.call<HaArea[]>(HA_COMMAND.areaRegistryList);
  }

  private async requireArea(areaId: string): Promise<void> {
    if (!(await this.list()).some((area) => area.area_id === areaId)) {
      throw new NotFoundException(apiError({ message: MESSAGE_ID.areaNotFound }));
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
      (area) => area.area_id !== ownId && area.name.toLocaleLowerCase() === lower,
    );

    if (taken)
      throw new ConflictException(
        apiError({ message: MESSAGE_ID.areaNameTaken, details: { params: { name } } }),
      );
  }
}
