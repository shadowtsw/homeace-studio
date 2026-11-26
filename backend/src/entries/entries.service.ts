import { BadRequestException, Inject, Injectable, NotFoundException } from "@nestjs/common";

import { apiError } from "src/common/api/api-response";
import { MESSAGE_ID } from "src/messages/message-ids";
import { CategoriesService } from "../categories/categories.service";
import { OVERLAY_REPOSITORY } from "../overlay/overlay.constants";
import type { OverlayRepository } from "../overlay/repositories/overlay.repository";
import { CATEGORY_SCOPE_BY_KIND, ENTRY_REPOSITORY, SERVICE_BY_ACTION } from "./entries.constants";
import { applyExtras, withExtras } from "./entry-extras";
import type { Entry, EntryAction, EntryChanges, EntryDetails } from "./entry.model";
import type { EntryRepository } from "./repositories/entry.repository";

export type EntryExtras = { isFavorite?: boolean; note?: string | null };

export type MoveToCategoryOptions = {
  entityId: string;
  /** Target folder like "Haus/Pool"; null removes the category. */
  categoryPath: string | null;
};

export type UpdateOptions = {
  entityId: string;
  changes: EntryChanges;
};

export type RunActionOptions = {
  entityId: string;
  action: EntryAction;
};

export type UpdateExtrasOptions = {
  entityId: string;
  extras: EntryExtras;
};

@Injectable()
export class EntriesService {
  constructor(
    @Inject(ENTRY_REPOSITORY) private readonly entries: EntryRepository,
    @Inject(OVERLAY_REPOSITORY) private readonly overlay: OverlayRepository,
    private readonly categories: CategoriesService,
  ) {}

  /** All automations, scripts, scenes and helpers with the user's extras, sorted by name. */
  async findAll(): Promise<Entry[]> {
    const [entries, overlay] = await Promise.all([this.entries.findAll(), this.overlay.read()]);

    return withExtras({ entries, overlay }).sort((first, second) =>
      first.name.localeCompare(second.name, undefined, { sensitivity: "base" }),
    );
  }

  /**
   * Moves an entry into a folder, written straight to HA's entity registry.
   */
  async moveToCategory({ entityId, categoryPath }: MoveToCategoryOptions): Promise<void> {
    const entry = await this.requireRegistered(entityId);

    await this.categories.assign({
      entityId,
      scope: CATEGORY_SCOPE_BY_KIND[entry.kind],
      currentCategoryId: entry.categoryId,
      targetPath: categoryPath,
    });
  }

  /** Aliases of a registered entry (HA leaves them out of the list). */
  /**
   * Aliases of an entry. Asks HA for this one registry entry only: checking it against the full list
   * (the whole entity registry and every state) on each opened entry cost noticeable CPU, in HA too.
   *
   * @throws BadRequestException `ENTRY_NOT_IN_REGISTRY` when HA has no registry entry for it.
   */
  async details(entityId: string): Promise<EntryDetails> {
    const details = await this.entries.findDetails(entityId);

    if (!details) {
      throw new BadRequestException(
        apiError({ message: MESSAGE_ID.entryNotInRegistry, details: { params: { entityId } } }),
      );
    }

    return details;
  }

  /**
   * Changes name, icon, area, labels, aliases, hidden or disabled in HA.
   * @returns The entry as HA now has it.
   */
  async update({ entityId, changes }: UpdateOptions): Promise<Entry> {
    await this.requireRegistered(entityId);
    await this.entries.update({ entityId, changes: normalizeChanges(changes) });

    return this.requireEntry(entityId);
  }

  /**
   * Runs an action, e.g. switches an automation off or runs a script.
   *
   * @throws BadRequestException `ENTRY_ACTION_UNSUPPORTED` when the domain has no such action.
   */
  async runAction({ entityId, action }: RunActionOptions): Promise<void> {
    const entry = await this.requireEntry(entityId);
    const service = SERVICE_BY_ACTION[action][entry.domain];

    if (!service) {
      throw new BadRequestException(
        apiError({
          message: MESSAGE_ID.entryActionUnsupported,
          details: { params: { entityId, action } },
        }),
      );
    }

    await this.entries.callService({ domain: entry.domain, service, entityId });
  }

  /** Saves favorite and note (overlay only). */
  async updateExtras({ entityId, extras }: UpdateExtrasOptions): Promise<void> {
    await this.requireEntry(entityId);
    await this.overlay.update((overlay) => applyExtras({ overlay, entityId, extras }));
  }

  private async requireEntry(entityId: string): Promise<Entry> {
    const entry = await this.entries.findOne(entityId);

    if (!entry) {
      throw new NotFoundException(
        apiError({ message: MESSAGE_ID.entryNotFound, details: { params: { entityId } } }),
      );
    }

    const [withOverlay] = withExtras({ entries: [entry], overlay: await this.overlay.read() });

    return withOverlay ?? entry;
  }

  /** Category, name, icon, area and labels need a registry entry; YAML-only entities have none. */
  private async requireRegistered(entityId: string): Promise<Entry> {
    const entry = await this.requireEntry(entityId);

    if (!entry.isInRegistry) {
      throw new BadRequestException(
        apiError({ message: MESSAGE_ID.entryNotInRegistry, details: { params: { entityId } } }),
      );
    }

    return entry;
  }
}

/** A blank name or icon means "back to the default", which HA expects as null. */
function normalizeChanges(changes: EntryChanges): EntryChanges {
  const blankToNull = (value: string | null | undefined): string | null | undefined =>
    value === undefined ? undefined : value?.trim() || null;

  return {
    ...changes,
    name: blankToNull(changes.name),
    icon: blankToNull(changes.icon),
    aliases: changes.aliases === undefined ? undefined : cleanAliases(changes.aliases),
  };
}

/** Trimmed, no blanks, each name once (ignoring case), in the given order. */
function cleanAliases(aliases: string[]): string[] {
  const seen = new Set<string>();

  return aliases
    .map((alias) => alias.trim())
    .filter((alias) => {
      const key = alias.toLocaleLowerCase();
      if (!alias || seen.has(key)) return false;
      seen.add(key);
      return true;
    });
}
