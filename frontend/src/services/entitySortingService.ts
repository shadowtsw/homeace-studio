import type { EntityMoveResult, EntitySortingMemory, SortingContext } from "@/types/entitySorting";

import { apiFetch, apiPost, apiSend } from "./api";

/** The tool "Entitäten einsortieren" (docs/features/entity-sorting.md). */
export function loadSortingContext(): Promise<SortingContext> {
  return apiFetch<SortingContext>("/entity-sorting");
}

/** Rules, turned-down folders and kept-out bundles; the last run is kept by the backend. */
export function saveSortingMemory(memory: Omit<EntitySortingMemory, "lastRun">): Promise<null> {
  return apiSend<null>("PUT", "/entity-sorting/memory", memory);
}

/** One batch of an apply; all batches of one apply share `runId`. */
export function applySortingMoves(
  runId: string,
  moves: { entityId: string; categoryPath: string | null }[],
): Promise<EntityMoveResult[]> {
  return apiPost<EntityMoveResult[]>("/entity-sorting/moves", { runId, moves });
}

export function undoSortingMoves(runId: string, entityIds: string[]): Promise<EntityMoveResult[]> {
  return apiPost<EntityMoveResult[]>("/entity-sorting/undo", { runId, entityIds });
}
