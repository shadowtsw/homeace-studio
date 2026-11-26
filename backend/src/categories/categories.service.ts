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
import { ENTITY_MOVE_STATUS, type EntityMoveResult } from "../entity-sorting/entity-sorting.model";
import { moveSortingPaths } from "../entity-sorting/sorting-memory";
import { HaCommandError } from "../ha/ha-command.error";
import { HA_ERROR_CODE } from "../ha/ha.constants";
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

/** One entity of a batch move; `expectedPath` makes it a no-op when the entity is elsewhere now. */
export type EntityMove = {
  entityId: string;
  targetPath: string | null;
  expectedPath?: string | null;
};

type PlannedRename = { scope: CategoryScope; categoryId: string; newName: string };

export type MoveEntityOptions = {
  entityId: string;
  targetPath: string | null;
};

export type RenameOptions = {
  from: string;
  to: string;
};

export type CleanUpOptions = {
  scope: CategoryScope;
  categoryId: string;
};

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
    const targetId =
      targetPath === null ? null : await this.findOrCreate({ scope, path: targetPath });

    if (targetId === currentCategoryId) return;

    await this.categories.assign(entityId, scope, targetId);

    if (currentCategoryId) {
      await this.cleanUp({ scope, categoryId: currentCategoryId });
    }
  }

  /**
   * Puts a plain entity (light, sensor, …) into a folder, or takes it out with null. Its folder is a
   * category in HomeAce Studio's own scope, so renaming and cleaning up work as for entries.
   *
   * @throws BadRequestException `ENTRY_NOT_IN_REGISTRY` when HA has no registry entry for it.
   */
  async moveEntity({ entityId, targetPath }: MoveEntityOptions): Promise<void> {
    const scope = CATEGORY_SCOPE.entities;
    const currentCategoryId = await this.categories.findEntityCategory(entityId, scope);

    if (currentCategoryId === undefined) {
      throw new BadRequestException(
        apiError({ message: MESSAGE_ID.entryNotInRegistry, details: { params: { entityId } } }),
      );
    }

    await this.assign({ entityId, scope, currentCategoryId, targetPath });
  }

  /**
   * Moves many plain entities at once (the tool "Entitäten einsortieren"). Reads the registry and the
   * category list once instead of per entity, and cleans up emptied folders once at the end. One
   * failing entity does not stop the others.
   */
  async moveEntities(moves: EntityMove[]): Promise<EntityMoveResult[]> {
    const scope = CATEGORY_SCOPE.entities;
    const [assignments, known] = await Promise.all([
      this.categories.listAssignments(scope),
      this.categories.list(scope),
    ]);
    const currentOf = new Map<string, string>();
    assignments.forEach((entityIds, categoryId) =>
      entityIds.forEach((entityId) => currentOf.set(entityId, categoryId)),
    );
    const idByName = new Map(known.map((category) => [category.name, category.categoryId]));
    const nameById = new Map(known.map((category) => [category.categoryId, category.name]));
    const emptied = new Set<string>();
    const results: EntityMoveResult[] = [];

    for (const move of moves) {
      const fromId = currentOf.get(move.entityId) ?? null;
      const from = fromId ? (nameById.get(fromId) ?? null) : null;
      const result = (status: EntityMoveResult["status"]): number =>
        results.push({ entityId: move.entityId, status, from });

      if (move.expectedPath !== undefined && move.expectedPath !== from) {
        result(ENTITY_MOVE_STATUS.changed);
        continue;
      }

      try {
        const targetPath = move.targetPath === null ? null : requireCategoryPath(move.targetPath);
        let targetId: string | null = null;

        if (targetPath !== null) {
          targetId =
            idByName.get(targetPath) ?? (await this.createOwned({ scope, path: targetPath }));
          idByName.set(targetPath, targetId);
          nameById.set(targetId, targetPath);
        }

        if (targetId === fromId) {
          result(ENTITY_MOVE_STATUS.unchanged);
          continue;
        }

        await this.categories.assign(move.entityId, scope, targetId);

        if (targetId) currentOf.set(move.entityId, targetId);
        else currentOf.delete(move.entityId);
        if (fromId) emptied.add(fromId);
        result(ENTITY_MOVE_STATUS.moved);
      } catch (error) {
        const isMissing = error instanceof HaCommandError && error.code === HA_ERROR_CODE.notFound;

        this.logger.warn(`Could not move ${move.entityId}: ${String(error)}`);
        result(isMissing ? ENTITY_MOVE_STATUS.notInRegistry : ENTITY_MOVE_STATUS.failed);
      }
    }

    for (const categoryId of emptied) await this.cleanUp({ scope, categoryId });

    return results;
  }

  /**
   * Renames a folder: every category named `from` or below it, in every scope.
   *
   * @returns How many HA categories were renamed.
   * @throws ConflictException when a new name already exists in a scope; nothing is renamed then.
   */
  async rename({ from, to }: RenameOptions): Promise<number> {
    const source = requireCategoryPath(from);
    const target = requireCategoryPath(to);

    if (source === target) return 0;

    if (isSameOrBelow({ path: target, ancestor: source })) {
      throw new BadRequestException(apiError({ message: MESSAGE_ID.categoryMoveIntoItself }));
    }

    // Plan all scopes first, so a conflict in one scope stops everything before HA changes.
    const plans = await Promise.all(
      CATEGORY_SCOPES.map((scope) => this.planRename({ scope, source, target })),
    );
    const renames = plans.flat();

    for (const { scope, categoryId, newName } of renames) {
      await this.categories.rename(scope, categoryId, newName);
    }

    // Empty folders and folder colors move along, so the folder keeps its subfolders and looks.
    const movePath = (path: string): string =>
      isSameOrBelow({ path, ancestor: source })
        ? replacePathPrefix({ path, from: source, to: target })
        : path;

    await this.overlay.update((overlay) => ({
      ...overlay,
      folders: overlay.folders.map(movePath),
      folderColors: Object.fromEntries(
        Object.entries(overlay.folderColors).map(([path, color]) => [movePath(path), color]),
      ),
      folderOrder: moveFolderOrder({ order: overlay.folderOrder, movePath }),
      entitySorting: moveSortingPaths({ memory: overlay.entitySorting, movePath }),
    }));

    this.logger.log(`Renamed "${source}" to "${target}" (${renames.length} categories)`);

    return renames.length;
  }

  private async planRename({
    scope,
    source,
    target,
  }: {
    scope: CategoryScope;
    source: string;
    target: string;
  }): Promise<PlannedRename[]> {
    const existing = await this.categories.list(scope);
    const affected = existing.filter((category) =>
      isSameOrBelow({ path: category.name, ancestor: source }),
    );
    const untouched = existing.filter((category) => !affected.includes(category));
    const untouchedNames = new Set(untouched.map((category) => category.name));

    const planned = affected.map((category) => ({
      scope,
      categoryId: category.categoryId,
      newName: replacePathPrefix({ path: category.name, from: source, to: target }),
    }));
    const conflict = planned.find((rename) => untouchedNames.has(rename.newName));

    if (conflict) {
      throw new ConflictException(
        apiError({
          message: MESSAGE_ID.categoryNameTaken,
          details: { params: { path: conflict.newName } },
        }),
      );
    }

    return planned;
  }

  private async findOrCreate({
    scope,
    path,
  }: {
    scope: CategoryScope;
    path: string;
  }): Promise<string> {
    const existing = await this.categories.list(scope);
    const match = existing.find((category) => category.name === path);

    if (match) return match.categoryId;

    return this.createOwned({ scope, path });
  }

  /** Creates the category and remembers that HomeAce Studio owns it (so it may delete it later). */
  private async createOwned({
    scope,
    path,
  }: {
    scope: CategoryScope;
    path: string;
  }): Promise<string> {
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
  async cleanUp({ scope, categoryId }: CleanUpOptions): Promise<void> {
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
