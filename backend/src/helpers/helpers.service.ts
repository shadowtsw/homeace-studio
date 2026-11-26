import { BadRequestException, Inject, Injectable, Logger, NotFoundException } from "@nestjs/common";

import { apiError } from "src/common/api/api-response";
import { MESSAGE_ID } from "src/messages/message-ids";
import { CATEGORY_SCOPE } from "../categories/categories.constants";
import { CategoriesService } from "../categories/categories.service";
import { removeExtras } from "../entries/entry-extras";
import { OVERLAY_REPOSITORY } from "../overlay/overlay.constants";
import type { OverlayRepository } from "../overlay/repositories/overlay.repository";
import type { CreateHelperDto } from "./dto/create-helper.dto";
import {
  buildCopyPayload,
  buildHelperPayload,
  buildUpdatePayload,
  helperSettingsOf,
  HelperSettingsError,
  type HelperSettings,
} from "./helper-payload";
import {
  ENTITY_LOOKUP_ATTEMPTS,
  ENTITY_LOOKUP_DELAY_MS,
  ENTITY_LOOKUP_WAIT,
  HELPER_REPOSITORY,
  HELPER_TYPES,
  type HelperType,
} from "./helpers.constants";
import type { HelperRepository } from "./repositories/helper.repository";

const ENTITY_ID_SEPARATOR = ".";

/** A helper HA keeps in one of its storage collections, with what it stores about it. */
type StorageHelper = {
  type: HelperType;
  helperId: string;
  categoryId: string | null;
  stored: Record<string, unknown>;
};

/** The settings of a storage helper as the form shows them. */
export type HelperSettingsView = { type: HelperType; settings: HelperSettings };

export type UpdateSettingsOptions = {
  entityId: string;
  settings: HelperSettings;
};

export type CopyOptions = {
  entityId: string;
  name: string;
  categoryPath: string | null;
};

@Injectable()
export class HelpersService {
  private readonly logger = new Logger(HelpersService.name);

  constructor(
    @Inject(HELPER_REPOSITORY) private readonly helpers: HelperRepository,
    private readonly categories: CategoriesService,
    @Inject(OVERLAY_REPOSITORY) private readonly overlay: OverlayRepository,
    @Inject(ENTITY_LOOKUP_WAIT) private readonly pause: (milliseconds: number) => Promise<void>,
  ) {}

  /**
   * Creates a helper in HA and, if a folder is given, sorts it in right away.
   *
   * @returns The entity ID of the new helper, e.g. "input_boolean.gaestemodus".
   */
  async create(dto: CreateHelperDto): Promise<{ entityId: string }> {
    const payload = this.toPayload(dto);
    const helperId = await this.helpers.create(dto.type, payload);
    const entityId = await this.waitForEntityId({ type: dto.type, helperId });

    if (!entityId) {
      // The helper exists; only the folder could not be set. Fall back to HA's usual ID scheme.
      this.logger.warn(`Entity of new ${dto.type} "${helperId}" not found; category not set`);
      return { entityId: dto.type + ENTITY_ID_SEPARATOR + helperId };
    }

    if (dto.categoryPath) {
      await this.categories.assign({
        entityId,
        scope: CATEGORY_SCOPE.helpers,
        currentCategoryId: null,
        targetPath: dto.categoryPath,
      });
    }

    this.logger.log(`Created ${entityId}`);

    return { entityId };
  }

  /**
   * Deletes a helper in HA, then its own extras and its category if that became empty.
   *
   * @throws BadRequestException `HELPER_NOT_DELETABLE` for helpers that are config entries
   *   (template, group, …); those have their own delete flow in HA.
   */
  async delete(entityId: string): Promise<void> {
    const registration = await this.helpers.findRegistration(entityId);

    if (!registration) {
      throw new NotFoundException(
        apiError({ message: MESSAGE_ID.entryNotFound, details: { params: { entityId } } }),
      );
    }

    const type = HELPER_TYPES.find((helperType) => helperType === registration.platform);

    if (!type) {
      throw new BadRequestException(
        apiError({ message: MESSAGE_ID.helperNotDeletable, details: { params: { entityId } } }),
      );
    }

    await this.helpers.remove(type, registration.uniqueId);
    await this.overlay.update((overlay) => removeExtras({ overlay, entityId }));

    if (registration.categoryId) {
      await this.categories.cleanUp({
        scope: CATEGORY_SCOPE.helpers,
        categoryId: registration.categoryId,
      });
    }

    this.logger.log(`Deleted ${entityId}`);
  }

  /**
   * The settings of a storage helper (input_*, counter, timer), as the form shows them.
   *
   * @throws BadRequestException `HELPER_NOT_EDITABLE` for config-entry helpers (template, group …).
   */
  async settings(entityId: string): Promise<HelperSettingsView> {
    const helper = await this.requireStorageHelper(entityId);

    return {
      type: helper.type,
      settings: helperSettingsOf({ type: helper.type, item: helper.stored }),
    };
  }

  /**
   * Saves new settings of a storage helper. Name, icon and fields the form does not show stay as
   * they are; HA replaces the stored helper, so they are sent along unchanged.
   *
   * @returns The settings as HA now has them.
   * @throws BadRequestException `HELPER_SETTINGS_INVALID` naming the first invalid setting.
   */
  async updateSettings({ entityId, settings }: UpdateSettingsOptions): Promise<HelperSettingsView> {
    const helper = await this.requireStorageHelper(entityId);
    const payload = this.checked(() =>
      buildUpdatePayload({ type: helper.type, stored: helper.stored, settings }),
    );

    await this.helpers.update(helper.type, helper.helperId, payload);
    this.logger.log(`Saved the settings of ${entityId}`);

    return this.settings(entityId);
  }

  /**
   * Creates a copy of a storage helper with all its settings and puts it into `categoryPath`.
   * HA starts its value fresh, like for any new helper.
   *
   * @returns The entity ID of the copy.
   */
  async copy({ entityId, name, categoryPath }: CopyOptions): Promise<string> {
    const helper = await this.requireStorageHelper(entityId);
    const helperId = await this.helpers.create(
      helper.type,
      buildCopyPayload({ stored: helper.stored, name }),
    );
    const copyId = await this.waitForEntityId({ type: helper.type, helperId });

    if (!copyId) {
      this.logger.warn(`Entity of the copy of ${entityId} not found; category not set`);
      return helper.type + ENTITY_ID_SEPARATOR + helperId;
    }

    if (categoryPath) {
      await this.categories.assign({
        entityId: copyId,
        scope: CATEGORY_SCOPE.helpers,
        currentCategoryId: null,
        targetPath: categoryPath,
      });
    }
    this.logger.log(`Copied ${entityId} to ${copyId}`);

    return copyId;
  }

  /**
   * @throws NotFoundException `ENTRY_NOT_FOUND` when HA does not know the entity or its stored helper.
   * @throws BadRequestException `HELPER_NOT_EDITABLE` for helpers that are config entries.
   */
  private async requireStorageHelper(entityId: string): Promise<StorageHelper> {
    const registration = await this.helpers.findRegistration(entityId);
    const notFound = (): NotFoundException =>
      new NotFoundException(
        apiError({ message: MESSAGE_ID.entryNotFound, details: { params: { entityId } } }),
      );

    if (!registration) throw notFound();

    const type = HELPER_TYPES.find((helperType) => helperType === registration.platform);

    if (!type) {
      throw new BadRequestException(
        apiError({ message: MESSAGE_ID.helperNotEditable, details: { params: { entityId } } }),
      );
    }

    const stored = await this.helpers.findStored(type, registration.uniqueId);

    if (!stored) throw notFound();

    return { type, helperId: registration.uniqueId, categoryId: registration.categoryId, stored };
  }

  private toPayload(dto: CreateHelperDto): Record<string, unknown> {
    return this.checked(() =>
      buildHelperPayload({
        type: dto.type,
        name: dto.name.trim(),
        icon: dto.icon?.trim(),
        settings: dto.settings ?? {},
      }),
    );
  }

  /**
   * Runs a payload builder; an invalid setting becomes `HELPER_SETTINGS_INVALID` with its field.
   */
  private checked(build: () => Record<string, unknown>): Record<string, unknown> {
    try {
      return build();
    } catch (error) {
      if (error instanceof HelperSettingsError) {
        throw new BadRequestException(
          apiError({
            message: MESSAGE_ID.helperSettingsInvalid,
            details: { params: { field: error.field } },
          }),
        );
      }

      throw error;
    }
  }

  /** HA registers the entity a moment after the helper; ask a few times. */
  private async waitForEntityId({
    type,
    helperId,
  }: {
    type: HelperType;
    helperId: string;
  }): Promise<string | null> {
    for (let attempt = 0; attempt < ENTITY_LOOKUP_ATTEMPTS; attempt++) {
      const entityId = await this.helpers.findEntityId(type, helperId);

      if (entityId) return entityId;

      await this.pause(ENTITY_LOOKUP_DELAY_MS);
    }

    return null;
  }
}
