import {
  ENTITY_BUNDLE_PREFIX,
  type EntitySortingMemory,
  type SortingRun,
  type SortingRunMove,
} from "./entity-sorting.model";

export type AddToRunOptions = {
  lastRun: SortingRun | null;
  runId: string;
  moves: SortingRunMove[];
  /** When a new run starts (ISO time); a continued run keeps its own. */
  at: string;
};

/** The first batch of a new run starts it; later batches of the same run add their moves. */
export function addToRun({ lastRun, runId, moves, at }: AddToRunOptions): SortingRun {
  if (lastRun?.runId !== runId) return { runId, at, moves };

  return { ...lastRun, moves: [...lastRun.moves, ...moves] };
}

export type MoveSortingPathsOptions = {
  memory: EntitySortingMemory;
  movePath: (path: string) => string;
};

/**
 * Folder paths in the memory follow a folder rename: rule targets, turned-down folders and the
 * last run (so undo still finds the folder).
 */
export function moveSortingPaths({
  memory,
  movePath,
}: MoveSortingPathsOptions): EntitySortingMemory {
  const moveOptional = (path: string | null): string | null => (path ? movePath(path) : path);

  return {
    ...memory,
    rules: memory.rules.map((rule) => ({ ...rule, target: movePath(rule.target) })),
    areaParent: memory.areaParent ? movePath(memory.areaParent) : memory.areaParent,
    rejected: memory.rejected.map((rejection) => ({
      ...rejection,
      paths: rejection.paths.map(movePath),
    })),
    lastRun: memory.lastRun && {
      ...memory.lastRun,
      moves: memory.lastRun.moves.map((move): SortingRunMove => ({
        ...move,
        from: moveOptional(move.from),
        to: moveOptional(move.to),
      })),
    },
  };
}

export type RenameSortingEntityOptions = {
  memory: EntitySortingMemory;
  from: string;
  to: string;
};

/** An entity ID rename carries its bundle key (entities without a device) and its last move. */
export function renameSortingEntity({
  memory,
  from,
  to,
}: RenameSortingEntityOptions): EntitySortingMemory {
  const renameKey = (key: string): string =>
    key === `${ENTITY_BUNDLE_PREFIX}${from}` ? `${ENTITY_BUNDLE_PREFIX}${to}` : key;

  return {
    ...memory,
    ignored: memory.ignored.map(renameKey),
    rejected: memory.rejected.map((rejection) => ({
      ...rejection,
      bundleKey: renameKey(rejection.bundleKey),
    })),
    lastRun: memory.lastRun && {
      ...memory.lastRun,
      moves: memory.lastRun.moves.map((move) => {
        if (move.entityId !== from) return move;

        return { ...move, entityId: to };
      }),
    },
  };
}
