import { Injectable } from "@nestjs/common";

import { CATEGORY_SCOPES, type CategoryScope } from "../../categories/categories.constants";
import { HaConnectionService } from "../../ha/ha-connection.service";
import { HaCommandError } from "../../ha/ha-command.error";
import { HA_COMMAND, HA_CONFIG_ENTRY_TYPE, HA_ERROR_CODE } from "../../ha/ha.constants";
import type {
  HaArea,
  HaCategory,
  HaConfigEntry,
  HaEntityRegistryEntry,
  HaLabel,
  HaState,
} from "../../ha/ha.types";
import { mapToEntries } from "../entry.mapper";
import type { Entry, EntryDetails } from "../entry.model";
import type { EntryRepository, UpdateEntryOptions, CallServiceOptions } from "./entry.repository";

/** For `hidden_by` / `disabled_by`: only "user" is ours to set; null gives the switch back to HA. */
function userFlag(isSet: boolean | undefined): "user" | null | undefined {
  if (isSet === undefined) return undefined;
  return isSet ? "user" : null;
}

/** Reads entries straight from HA on every call; a cache follows once live updates exist. */
@Injectable()
export class HaEntriesRepository implements EntryRepository {
  constructor(private readonly ha: HaConnectionService) {}

  async findAll(): Promise<Entry[]> {
    const helperFilter = { type_filter: [HA_CONFIG_ENTRY_TYPE.helper] };

    const [registryEntries, states, helperConfigEntries, categoriesByScope, labels, areas] =
      await Promise.all([
        this.ha.call<HaEntityRegistryEntry[]>({ type: HA_COMMAND.entityRegistryList }),
        this.ha.call<HaState[]>({ type: HA_COMMAND.getStates }),
        this.ha.call<HaConfigEntry[]>({ type: HA_COMMAND.configEntriesGet, payload: helperFilter }),
        this.loadCategoriesByScope(),
        this.ha.call<HaLabel[]>({ type: HA_COMMAND.labelRegistryList }),
        this.ha.call<HaArea[]>({ type: HA_COMMAND.areaRegistryList }),
      ]);

    const helperConfigEntryIds = new Set(helperConfigEntries.map((entry) => entry.entry_id));

    return mapToEntries({
      registryEntries,
      states,
      helperConfigEntryIds,
      categoriesByScope,
      labels,
      areas,
    });
  }

  async findOne(entityId: string): Promise<Entry | null> {
    const entries = await this.findAll();

    return entries.find((entry) => entry.entityId === entityId) ?? null;
  }

  async update({ entityId, changes }: UpdateEntryOptions): Promise<void> {
    const aliases = await this.aliasesToSave({ entityId, aliases: changes.aliases });

    // Only fields that are set go to HA; undefined means "leave as it is".
    const fields = {
      name: changes.name,
      icon: changes.icon,
      area_id: changes.areaId,
      labels: changes.labelIds,
      aliases,
      hidden_by: userFlag(changes.isHidden),
      disabled_by: userFlag(changes.isDisabled),
    };
    const definedFields = Object.entries(fields).filter(([, value]) => value !== undefined);

    await this.ha.call({
      type: HA_COMMAND.entityRegistryUpdate,
      payload: {
        entity_id: entityId,
        ...Object.fromEntries(definedFields),
      },
    });
  }

  async findDetails(entityId: string): Promise<EntryDetails | null> {
    let entry: HaEntityRegistryEntry;
    try {
      entry = await this.ha.call<HaEntityRegistryEntry>({
        type: HA_COMMAND.entityRegistryGet,
        payload: {
          entity_id: entityId,
        },
      });
    } catch (error) {
      if (error instanceof HaCommandError && error.code === HA_ERROR_CODE.notFound) return null;
      throw error;
    }

    return {
      aliases: (entry.aliases ?? []).filter((alias): alias is string => typeof alias === "string"),
    };
  }

  /**
   * The aliases to send, or undefined to leave them. HA's null in the aliases means "the name
   * itself"; it must survive our list of names, so HA is asked first (only when aliases change).
   */
  private async aliasesToSave({
    entityId,
    aliases,
  }: {
    entityId: string;
    aliases: string[] | undefined;
  }): Promise<(string | null)[] | undefined> {
    if (aliases === undefined) return undefined;

    const placeholders = await this.namePlaceholders(entityId);
    return [...placeholders, ...aliases];
  }

  private async namePlaceholders(entityId: string): Promise<null[]> {
    const entry = await this.ha.call<HaEntityRegistryEntry>({
      type: HA_COMMAND.entityRegistryGet,
      payload: {
        entity_id: entityId,
      },
    });

    return (entry.aliases ?? []).some((alias) => alias === null) ? [null] : [];
  }

  async callService({ domain, service, entityId }: CallServiceOptions): Promise<void> {
    await this.ha.call({
      type: HA_COMMAND.callService,
      payload: {
        domain,
        service,
        target: { entity_id: entityId },
      },
    });
  }

  private async loadCategoriesByScope(): Promise<Record<CategoryScope, HaCategory[]>> {
    const categoryLists = await Promise.all(
      CATEGORY_SCOPES.map((scope) =>
        this.ha.call<HaCategory[]>({ type: HA_COMMAND.categoryRegistryList, payload: { scope } }),
      ),
    );
    const pairs = CATEGORY_SCOPES.map((scope, index) => [scope, categoryLists[index]]);

    return Object.fromEntries(pairs) as Record<CategoryScope, HaCategory[]>;
  }
}
