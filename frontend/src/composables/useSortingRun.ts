import { ref, type Ref } from "vue";

import { applySortingMoves, undoSortingMoves } from "@/services/entitySortingService";
import { SORTING_STEP, useEntitySortingStore } from "@/stores/entitySortingStore";
import { useLookupsStore } from "@/stores/lookupsStore";
import type { EntityMoveResult, SortingContext } from "@/types/entitySorting";
import { existingFolders } from "@/utils/entitySorting/home";

/** The browser sends this many moves per request, so the bar can show progress. */
const BATCH_SIZE = 50;

export type SortingProgress = { done: number; total: number };

/** An automation without folder whose own entities all sit in one folder now. */
export type FolderHint = { flowName: string; folder: string };

export type SortingResult = {
  moved: number;
  folders: number;
  newFolders: number;
  failed: EntityMoveResult[];
  hints: FolderHint[];
};

type SortingRun = {
  progress: Ref<SortingProgress | null>;
  result: Ref<SortingResult | null>;
  isUndoing: Ref<boolean>;
  apply: () => Promise<void>;
  undo: () => Promise<number>;
};

/** Not crypto.randomUUID: behind plain-http ingress it does not exist. */
function newRunId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

function batches<T>(items: T[]): T[][] {
  const result: T[][] = [];
  for (let start = 0; start < items.length; start += BATCH_SIZE)
    result.push(items.slice(start, start + BATCH_SIZE));

  return result;
}

/** Automations without a folder that only trigger on or switch entities of one folder. */
function folderHints(context: SortingContext): FolderHint[] {
  const folderOf = new Map(
    context.entities.map((entity) => [entity.entityId, entity.categoryPath]),
  );
  const hints: FolderHint[] = [];

  for (const flow of context.flows) {
    if (flow.categoryPath) continue;

    const core = flow.uses
      .filter((use) => use.roles.some((role) => role === "trigger" || role === "action"))
      .map((use) => folderOf.get(use.entityId) ?? null);
    const folders = new Set(core);
    const [folder] = [...folders];

    if (core.length && folders.size === 1 && folder) hints.push({ flowName: flow.name, folder });
  }

  return hints;
}

/** Apply and undo of the tool, in batches with progress; afterwards everything is read again. */
export function useSortingRun(): SortingRun {
  const sorting = useEntitySortingStore();
  const lookups = useLookupsStore();
  const progress = ref<SortingProgress | null>(null);
  const result = ref<SortingResult | null>(null);
  const isUndoing = ref(false);

  async function apply(): Promise<void> {
    const moves = sorting.moves;
    if (!moves.length) return;

    const runId = newRunId();
    const before = existingFolders(sorting.home?.context.folders ?? []);
    const results: EntityMoveResult[] = [];
    progress.value = { done: 0, total: moves.length };
    sorting.step = SORTING_STEP.apply;

    for (const batch of batches(moves)) {
      try {
        results.push(...(await applySortingMoves({ runId, moves: batch })));
      } catch {
        // The whole batch failed (connection, HA away); the rest still gets its chance.
        results.push(
          ...batch.map((move) => ({
            entityId: move.entityId,
            status: "failed" as const,
            from: null,
          })),
        );
      }
      progress.value = { done: progress.value.done + batch.length, total: moves.length };
    }

    const targetOf = new Map(moves.map((move) => [move.entityId, move.categoryPath]));
    const moved = results.filter((item) => item.status === "moved" || item.status === "unchanged");
    const targets = new Set(moved.map((item) => targetOf.get(item.entityId) ?? ""));

    await sorting.load();
    await lookups.loadEntities(true);

    result.value = {
      moved: moved.length,
      folders: targets.size,
      newFolders: [...targets].filter((path) => !before.has(path)).length,
      failed: results.filter((item) => item.status === "failed" || item.status === "notInRegistry"),
      hints: sorting.home ? folderHints(sorting.home.context) : [],
    };
    progress.value = null;
    sorting.step = SORTING_STEP.result;
  }

  /** @returns How many entities went back. */
  async function undo(): Promise<number> {
    const run = sorting.lastRun;
    if (!run) return 0;

    isUndoing.value = true;
    let undone = 0;

    try {
      for (const batch of batches(run.moves.map((move) => move.entityId))) {
        const results = await undoSortingMoves({ runId: run.runId, entityIds: batch });
        undone += results.filter((item) => item.status === "moved").length;
      }
    } finally {
      await sorting.load();
      await lookups.loadEntities(true);
      result.value = null;
      isUndoing.value = false;
    }

    return undone;
  }

  return { progress, result, isUndoing, apply, undo };
}
