import type { EntityMoveResult, EntitySortingMemory, SortingContext } from "@/types/entitySorting";

import { apiFetch, apiPost, apiSend } from "./api";

/** The tool "Entitäten einsortieren" (docs/features/entity-sorting.md). */
export function loadSortingContext(): Promise<SortingContext> {
  return apiFetch<SortingContext>({ path: "/entity-sorting" });
}

/** Rules, turned-down folders and kept-out bundles; the last run is kept by the backend. */
export function saveSortingMemory(memory: Omit<EntitySortingMemory, "lastRun">): Promise<null> {
  return apiSend<null>({ method: "PUT", path: "/entity-sorting/memory", body: memory });
}

export type ApplySortingMovesOptions = {
  runId: string;
  moves: { entityId: string; categoryPath: string | null }[];
};

/** One batch of an apply; all batches of one apply share `runId`. */
export function applySortingMoves({
  runId,
  moves,
}: ApplySortingMovesOptions): Promise<EntityMoveResult[]> {
  return apiPost<EntityMoveResult[]>({ path: "/entity-sorting/moves", body: { runId, moves } });
}

export type UndoSortingMovesOptions = {
  runId: string;
  entityIds: string[];
};

export function undoSortingMoves({
  runId,
  entityIds,
}: UndoSortingMovesOptions): Promise<EntityMoveResult[]> {
  return apiPost<EntityMoveResult[]>({ path: "/entity-sorting/undo", body: { runId, entityIds } });
}
