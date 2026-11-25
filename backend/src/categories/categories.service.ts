import { BadRequestException, ConflictException, Inject, Injectable, Logger } from "@nestjs/common";

import { moveFolderOrder } from "./folder-order";
import { apiError } from "src/common/api/api-response";
import { MESSAGE_ID } from "src/messages/message-ids";
import { OVERLAY_REPOSITORY } from "../overlay/overlay.constants";
import type { OverlayRepository } from "../overlay/repositories/overlay.repository";
import {
  CATEGORY_REPOSITORY,
  CATEGORY_SCOPE,
  CATEGORY_SCOPES,
  type CategoryScope,
} from "./categories.constants";
import { isSameOrBelow, replacePathPrefix } from "./category-path";
import { requireCategoryPath } from "./require-category-path";
import type { CategoryRepository } from "./repositories/category.repository";

export type CategoryAssignment = {
  entityId: string;
  scope: CategoryScope;
  /** The entity's category in this scope right now; null when it has none. */
  currentCategoryId: string | null;
  /** Full path of the target folder; null removes the category. */
  targetPath: string | null;
};

type PlannedRename = { scope: CategoryScope; categoryId: string; newName: string };

/**
 * Keeps HA categories in step with the folder tree.
 *
 * Rules (docs/architecture.md): HA only holds categories that have entries. A missing
 * category is created when the first entry moves in, and deleted again when the last one leaves,
 * but only if HomeAce Studio created it (tracked in the overlay).
 */
@Injectable()
export class CategoriesService {
  private readonly logger = new Logger(CategoriesService.name);

  constructor(
    @Inject(CATEGORY_REPOSITORY) private readonly categories: CategoryRepository,
    @Inject(OVERLAY_REPOSITORY) private readonly overlay: OverlayRepository,
  ) {}

  async assign(assignment: CategoryAssignment): Promise<void> {
    const { entityId, scope, currentCategoryId } = assignment;
    const targetPath =
      assignment.targetPath === null ? null : requireCategoryPath(assignment.targetPath);
    const targetId = targetPath === null ? null : await this.findOrCreate(scope, targetPath);

    if (targetId === currentCategoryId) return;

    await this.categories.assign(entityId, scope, targetId);

    if (currentCategoryId) {
      await this.cleanUp(scope, currentCategoryId);
    }
  }

  /**
   * Puts a plain entity (light, sensor, …) into a folder, or takes it out with null. Its folder is a
   * category in HomeAce Studio's own scope, so renaming and cleaning up work as for entries.
   *
   * @throws BadRequestException `ENTRY_NOT_IN_REGISTRY` when HA has no registry entry for it.
   */
  async moveEntity(entityId: string, targetPath: string | null): Promise<void> {
    const scope = CATEGORY_SCOPE.entities;
    const currentCategoryId = await this.categories.findEntityCategory(entityId, scope);

    if (currentCategoryId === undefined) {
      throw new BadRequestException(
        apiError(MESSAGE_ID.entryNotInRegistry, { params: { entityId } }),
      );
    }

    await this.assign({ entityId, scope, currentCategoryId, targetPath });
  }

  /**
   * Renames a folder: every category named `from` or below it, in every scope.
   *
   * @returns How many HA categories were renamed.
   * @throws ConflictException when a new name already exists in a scope; nothing is renamed then.
   */
  async rename(from: string, to: string): Promise<number> {
    const source = requireCategoryPath(from);
    const target = requireCategoryPath(to);

    if (source === target) return 0;

    if (isSameOrBelow(target, source)) {
      throw new BadRequestException(apiError(MESSAGE_ID.categoryMoveIntoItself));
    }

    // Plan all scopes first, so a conflict in one scope stops everything before HA changes.
    const plans = await Promise.all(
      CATEGORY_SCOPES.map((scope) => this.planRename(scope, source, target)),
    );
    const renames = plans.flat();

    for (const { scope, categoryId, newName } of renames) {
      await this.categories.rename(scope, categoryId, newName);
    }

    // Empty folders and folder colors move along, so the folder keeps its subfolders and looks.
    const movePath = (path: string): string =>
      isSameOrBelow(path, source) ? replacePathPrefix(path, source, target) : path;

    await this.overlay.update((overlay) => ({
      ...overlay,
      folders: overlay.folders.map(movePath),
      folderColors: Object.fromEntries(
        Object.entries(overlay.folderColors).map(([path, color]) => [movePath(path), color]),
      ),
      folderOrder: moveFolderOrder(overlay.folderOrder, movePath),
    }));

    this.logger.log(`Renamed "${source}" to "${target}" (${renames.length} categories)`);

    return renames.length;
  }

  private async planRename(
    scope: CategoryScope,
    source: string,
    target: string,
  ): Promise<PlannedRename[]> {
    const existing = await this.categories.list(scope);
    const affected = existing.filter((category) => isSameOrBelow(category.name, source));
    const untouched = existing.filter((category) => !affected.includes(category));
    const untouchedNames = new Set(untouched.map((category) => category.name));

    const planned = affected.map((category) => ({
      scope,
      categoryId: category.categoryId,
      newName: replacePathPrefix(category.name, source, target),
    }));
    const conflict = planned.find((rename) => untouchedNames.has(rename.newName));

    if (conflict) {
      throw new ConflictException(
        apiError(MESSAGE_ID.categoryNameTaken, { params: { path: conflict.newName } }),
      );
    }

    return planned;
  }

  private async findOrCreate(scope: CategoryScope, path: string): Promise<string> {
    const existing = await this.categories.list(scope);
    const match = existing.find((category) => category.name === path);

    if (match) return match.categoryId;

    const created = await this.categories.create(scope, path);
    await this.overlay.update((overlay) => ({
      ...overlay,
      ownedCategoryIds: [...overlay.ownedCategoryIds, created.categoryId],
    }));
    this.logger.log(`Created category "${path}" in scope "${scope}"`);

    return created.categoryId;
  }

  /**
   * Deletes a category if HomeAce Studio created it and nobody uses it anymore.
   * Call it after an entity left the category (moved, deleted).
   */
  async cleanUp(scope: CategoryScope, categoryId: string): Promise<void> {
    const overlay = await this.overlay.read();

    if (!overlay.ownedCategoryIds.includes(categoryId)) return;

    const assignedCount = await this.categories.countAssigned(scope, categoryId);

    if (assignedCount > 0) return;

    await this.categories.delete(scope, categoryId);
    await this.overlay.update((current) => ({
      ...current,
      ownedCategoryIds: current.ownedCategoryIds.filter((id) => id !== categoryId),
    }));
    this.logger.log(`Deleted empty category ${categoryId} in scope "${scope}"`);
  }
}
