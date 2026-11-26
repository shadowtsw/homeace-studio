import { Inject, Injectable, NotFoundException } from "@nestjs/common";

import { CategoriesService } from "../categories/categories.service";
import { apiError } from "../common/api/api-response";
import { DependenciesService } from "../dependencies/dependencies.service";
import { MESSAGE_ID } from "../messages/message-ids";
import { OVERLAY_REPOSITORY } from "../overlay/overlay.constants";
import type { OverlayRepository } from "../overlay/repositories/overlay.repository";
import { HomeSnapshotService } from "../snapshot/home-snapshot.service";
import { SORTING_SOURCES_REPOSITORY } from "./entity-sorting.constants";
import {
  ENTITY_MOVE_STATUS,
  EMPTY_SORTING_MEMORY,
  type EntityMoveResult,
  type EntitySortingMemory,
  type SortingContext,
  type SortingRun,
} from "./entity-sorting.model";
import type { SortingSourcesRepository } from "./repositories/sorting-sources.repository";
import { buildSortingContext } from "./sorting-context";

/** What the browser may change of the memory; the last run is written by the moves only. */
export type SortingMemoryChanges = Omit<EntitySortingMemory, "lastRun">;

export type SortingMove = { entityId: string; categoryPath: string | null };

export type ApplyMovesOptions = {
  runId: string;
  moves: SortingMove[];
};

export type UndoOptions = {
  runId: string;
  entityIds: string[];
};

/** The tool "Entitäten einsortieren" (docs/features/entity-sorting.md). */
@Injectable()
export class EntitySortingService {
  constructor(
    private readonly snapshots: HomeSnapshotService,
    private readonly dependencies: DependenciesService,
    private readonly categories: CategoriesService,
    @Inject(SORTING_SOURCES_REPOSITORY) private readonly sources: SortingSourcesRepository,
    @Inject(OVERLAY_REPOSITORY) private readonly overlay: OverlayRepository,
  ) {}

  async context(): Promise<SortingContext> {
    const [snapshot, floors, labels, entityCategories, integrations, overlay] = await Promise.all([
      this.snapshots.get(),
      this.sources.floors(),
      this.sources.labels(),
      this.sources.entityCategories(),
      this.sources.integrationNames(),
      this.overlay.read(),
    ]);

    return buildSortingContext({
      entries: snapshot.entries,
      states: snapshot.states,
      registry: snapshot.registry,
      devices: snapshot.devices,
      areas: snapshot.areas,
      floors,
      labels,
      entityCategories,
      integrations,
      dependencies: this.dependencies.indexOf(snapshot),
      emptyFolders: overlay.folders,
      // Older overlays lack fields added later.
      memory: { ...EMPTY_SORTING_MEMORY, ...overlay.entitySorting },
    });
  }

  async saveMemory(changes: SortingMemoryChanges): Promise<void> {
    await this.overlay.update((overlay) => ({
      ...overlay,
      entitySorting: { ...changes, lastRun: overlay.entitySorting?.lastRun ?? null },
    }));
  }

  /**
   * One batch of a run. The first batch of a new `runId` replaces the last run, so undo always
   * covers the whole latest apply, however many batches it took.
   */
  async applyMoves({ runId, moves }: ApplyMovesOptions): Promise<EntityMoveResult[]> {
    const results = await this.categories.moveEntities(
      moves.map((move) => ({ entityId: move.entityId, targetPath: move.categoryPath })),
    );
    const targetOf = new Map(moves.map((move) => [move.entityId, move.categoryPath]));
    const moved = results
      .filter((result) => result.status === ENTITY_MOVE_STATUS.moved)
      .map((result) => ({
        entityId: result.entityId,
        from: result.from,
        to: targetOf.get(result.entityId) ?? null,
      }));

    await this.overlay.update((overlay) => {
      const memory = overlay.entitySorting ?? EMPTY_SORTING_MEMORY;
      const current = memory.lastRun?.runId === runId ? memory.lastRun : null;
      const lastRun: SortingRun = current
        ? { ...current, moves: [...current.moves, ...moved] }
        : { runId, at: new Date().toISOString(), moves: moved };

      return { ...overlay, entitySorting: { ...memory, lastRun } };
    });

    return results;
  }

  /**
   * Moves entities of the last run back where they were. An entity whose folder changed since the
   * run is left alone. Done entities leave the run; once it is empty, there is nothing to undo.
   *
   * @throws NotFoundException `ENTITY_SORTING_RUN_NOT_FOUND` when `runId` is not the last run.
   */
  async undo({ runId, entityIds }: UndoOptions): Promise<EntityMoveResult[]> {
    const overlay = await this.overlay.read();
    const run = overlay.entitySorting?.lastRun;

    if (!run || run.runId !== runId) {
      throw new NotFoundException(apiError({ message: MESSAGE_ID.entitySortingRunNotFound }));
    }

    const wanted = new Set(entityIds);
    const moves = run.moves.filter((move) => wanted.has(move.entityId));
    const results = await this.categories.moveEntities(
      moves.map((move) => ({
        entityId: move.entityId,
        targetPath: move.from,
        expectedPath: move.to,
      })),
    );
    const done = new Set(
      results
        .filter((result) => result.status !== ENTITY_MOVE_STATUS.failed)
        .map((result) => result.entityId),
    );

    await this.overlay.update((current) => {
      const memory = current.entitySorting ?? EMPTY_SORTING_MEMORY;
      if (memory.lastRun?.runId !== runId) return current;

      const left = memory.lastRun.moves.filter((move) => !done.has(move.entityId));
      const lastRun = left.length ? { ...memory.lastRun, moves: left } : null;

      return { ...current, entitySorting: { ...memory, lastRun } };
    });

    return results;
  }
}
