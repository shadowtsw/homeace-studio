import { ref } from "vue";

/** Own MIME type, so a dragged folder is not mistaken for an entry or a file. */
export const FOLDER_DRAG_TYPE = "application/x-homeace-folder";

/**
 * The folder being dragged to sort it. Browsers hide drag data during dragover, so the tree nodes
 * read the path from here to decide where it may go (only between its siblings).
 */
export const draggedFolder = ref<string | null>(null);
