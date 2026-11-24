import { Injectable } from "@nestjs/common";

import { CATEGORY_SCOPE } from "../../categories/categories.constants";
import { HaConnectionService } from "../../ha/ha-connection.service";
import { HA_COMMAND } from "../../ha/ha.constants";
import type { HaEntityRegistryEntry } from "../../ha/ha.types";
import type { HelperType } from "../helpers.constants";
import type { HelperRegistration, HelperRepository } from "./helper.repository";

/** HA names the id field after the type: `input_boolean_id`, `counter_id`, … */
const HELPER_ID_FIELD_SUFFIX = "_id";

@Injectable()
export class HaHelpersRepository implements HelperRepository {
  constructor(private readonly ha: HaConnectionService) {}

  async create(type: HelperType, payload: Record<string, unknown>): Promise<string> {
    const created = await this.ha.call<{ id: string }>(
      type + HA_COMMAND.helperCreateSuffix,
      payload,
    );

    return created.id;
  }

  async findRegistration(entityId: string): Promise<HelperRegistration | null> {
    const entries = await this.ha.call<HaEntityRegistryEntry[]>(HA_COMMAND.entityRegistryList);
    const entry = entries.find((item) => item.entity_id === entityId);

    if (!entry) return null;

    return {
      platform: entry.platform,
      uniqueId: entry.unique_id,
      categoryId: entry.categories[CATEGORY_SCOPE.helpers] ?? null,
    };
  }

  async findStored(type: HelperType, helperId: string): Promise<Record<string, unknown> | null> {
    const items = await this.ha.call<Record<string, unknown>[]>(type + HA_COMMAND.helperListSuffix);

    return items.find((item) => item.id === helperId) ?? null;
  }

  async update(
    type: HelperType,
    helperId: string,
    payload: Record<string, unknown>,
  ): Promise<void> {
    await this.ha.call(type + HA_COMMAND.helperUpdateSuffix, {
      ...payload,
      [type + HELPER_ID_FIELD_SUFFIX]: helperId,
    });
  }

  async remove(type: HelperType, helperId: string): Promise<void> {
    await this.ha.call(type + HA_COMMAND.helperDeleteSuffix, {
      [type + HELPER_ID_FIELD_SUFFIX]: helperId,
    });
  }

  async findEntityId(type: HelperType, helperId: string): Promise<string | null> {
    const entries = await this.ha.call<HaEntityRegistryEntry[]>(HA_COMMAND.entityRegistryList);
    // The helper's platform is its type, and its storage id is the entity's unique_id.
    const match = entries.find((entry) => entry.platform === type && entry.unique_id === helperId);

    return match?.entity_id ?? null;
  }
}
