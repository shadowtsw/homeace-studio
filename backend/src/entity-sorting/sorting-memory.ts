import {
  ENTITY_BUNDLE_PREFIX,
  type EntitySortingMemory,
  type SortingRunMove,
} from "./entity-sorting.model";

/**
 * Folder paths in the memory follow a folder rename: rule targets, turned-down folders and the
 * last run (so undo still finds the folder).
 */
export function moveSortingPaths(
  memory: EntitySortingMemory,
  movePath: (path: string) => string,
): EntitySortingMemory {
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

/** An entity ID rename carries its bundle key (entities without a device) and its last move. */
export function renameSortingEntity(
  memory: EntitySortingMemory,
  from: string,
  to: string,
): EntitySortingMemory {
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
      moves: memory.lastRun.moves.map((move) =>
        move.entityId === from ? { ...move, entityId: to } : move,
      ),
    },
  };
}
