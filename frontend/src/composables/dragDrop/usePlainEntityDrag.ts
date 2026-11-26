import { ref } from "vue";

import type { EntityOption } from "@/types/editor";

/**
 * The plain entity being dragged from the list. Browsers hide the drag data during dragover, so
 * drop targets (flow sections, the scene list) read it here to show what would happen, like
 * `draggedFolder` does for folders.
 */
const dragged = ref<EntityOption | null>(null);
/** When the last drop happened: a scroll right after it must not close the menu it opened. */
const lastDropAt = ref(0);

/** Leave room for the browser to settle after a drop (hints vanish, a list may get shorter). */
const SETTLE_MS = 600;

export function usePlainEntityDrag() {
  return {
    dragged,
    start: (entity: EntityOption): void => {
      dragged.value = entity;
    },
    end: (): void => {
      dragged.value = null;
    },
    /** Call on drop; `isSettling` then stays true for a moment. */
    markDrop: (): void => {
      lastDropAt.value = Date.now();
    },
    isSettling: (): boolean => Date.now() - lastDropAt.value < SETTLE_MS,
  };
}
