import { ref, type Ref } from "vue";

import { parentOf } from "@/utils/categories/folderOrder";

/** Own MIME type, so a dragged folder is not mistaken for an entry or a file. */
export const FOLDER_DRAG_TYPE = "application/x-homeace-folder";

/**
 * The folder being dragged to sort it. Browsers hide drag data during dragover, so the tree nodes
 * read the path from here to decide where it may go (only between its siblings).
 */
export const draggedFolder = ref<string | null>(null);

/** The drag handlers of what else may be dropped on a folder (entries, plain entities). */
type EntryDropHandlers = {
  onDragOver: (event: DragEvent) => void;
  onDragLeave: () => void;
  onDrop: (event: DragEvent) => void;
};

type UseFolderDragOptions = {
  /** The folder of this tree node. */
  path: Ref<string>;
  entryDrop: EntryDropHandlers;
  /** A sibling folder was dropped before or after this one. */
  onReorder: (options: { moved: string; target: string; isBefore: boolean }) => void;
};

/**
 * Sorting folders by drag & drop in the tree: a folder can be dragged before or after one of its
 * siblings. Everything else dragged over a folder (entries, entities) goes to `entryDrop`.
 */
export function useFolderDrag({ path, entryDrop, onReorder }: UseFolderDragOptions) {
  /** Where a dragged sibling folder would land: a line above or below this one. */
  const sortDrop = ref<"before" | "after" | null>(null);

  function startDrag(event: DragEvent): void {
    if (!event.dataTransfer) return;
    event.stopPropagation();
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData(FOLDER_DRAG_TYPE, path.value);
    draggedFolder.value = path.value;
  }

  /** The drag ended, dropped or not. */
  function endDrag(): void {
    draggedFolder.value = null;
  }

  /** Only a sibling can be sorted here, not the folder itself. */
  function isSortableHere(moved: string): boolean {
    return moved !== path.value && parentOf(moved) === parentOf(path.value);
  }

  function onDragOver(event: DragEvent): void {
    const moved = draggedFolder.value;

    if (moved === null) {
      entryDrop.onDragOver(event);
      return;
    }
    if (!isSortableHere(moved)) return;

    event.preventDefault();
    event.stopPropagation();
    const box = (event.currentTarget as HTMLElement).getBoundingClientRect();
    const isUpperHalf = event.clientY < box.top + box.height / 2;
    sortDrop.value = isUpperHalf ? "before" : "after";
  }

  function onDragLeave(): void {
    sortDrop.value = null;
    entryDrop.onDragLeave();
  }

  function onDrop(event: DragEvent): void {
    const moved = draggedFolder.value;
    const position = sortDrop.value;
    sortDrop.value = null;

    if (moved === null) {
      entryDrop.onDrop(event);
      return;
    }
    event.preventDefault();
    event.stopPropagation();
    draggedFolder.value = null;
    if (position && isSortableHere(moved)) {
      onReorder({ moved, target: path.value, isBefore: position === "before" });
    }
  }

  return { sortDrop, startDrag, endDrag, onDragOver, onDragLeave, onDrop };
}
