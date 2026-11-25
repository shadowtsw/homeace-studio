import { ref, type Ref } from "vue";

import {
  carriesEntity,
  carriesPlainEntity,
  getDraggedEntity,
  getDraggedPlainEntity,
} from "@/utils/dragDrop";

type DropTarget = {
  /** True while one of our entries hovers over the target, for the highlight. */
  isDropOver: Ref<boolean>;
  onDragOver: (event: DragEvent) => void;
  onDragLeave: () => void;
  onDrop: (event: DragEvent) => void;
};

/**
 * Makes an element accept dragged list entries, and plain entities when it can take them.
 *
 * @param onEntryDropped - Called with the entity ID when an entry is dropped here.
 * @param onPlainEntityDropped - Called for a plain entity (light, sensor …); without it, they are
 *   not accepted (areas, for example, do not take them).
 */
export function useEntryDropTarget(
  onEntryDropped: (entityId: string) => void,
  onPlainEntityDropped?: (entityId: string) => void,
): DropTarget {
  const isDropOver = ref(false);

  function onDragOver(event: DragEvent): void {
    const carriesPlain =
      onPlainEntityDropped !== undefined && carriesPlainEntity(event.dataTransfer);
    if (!carriesEntity(event.dataTransfer) && !carriesPlain) return;

    // preventDefault() is what tells the browser "dropping here is allowed".
    event.preventDefault();
    if (event.dataTransfer) event.dataTransfer.dropEffect = "move";
    isDropOver.value = true;
  }

  function onDragLeave(): void {
    isDropOver.value = false;
  }

  function onDrop(event: DragEvent): void {
    isDropOver.value = false;
    const plainEntityId = onPlainEntityDropped ? getDraggedPlainEntity(event.dataTransfer) : null;

    if (plainEntityId) {
      event.preventDefault();
      onPlainEntityDropped?.(plainEntityId);
      return;
    }

    const entityId = getDraggedEntity(event.dataTransfer);

    if (!entityId) return;

    event.preventDefault();
    onEntryDropped(entityId);
  }

  return { isDropOver, onDragOver, onDragLeave, onDrop };
}
