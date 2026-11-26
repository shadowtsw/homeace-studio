import { useEventListener, useResizeObserver } from "@vueuse/core";
import { computed, ref, type Ref } from "vue";

/** Distance to the anchor and to the window edges, in px. */
const GAP = 6;
const EDGE = 12;

type UseAnchoredPlacementOptions = {
  panel: Ref<HTMLElement | null>;
  anchor: Ref<HTMLElement>;
  /** True where the panel is a sheet at the bottom instead (phones): then it is not placed. */
  isSheet: Ref<boolean>;
};

/**
 * Keeps a fixed panel next to the element it belongs to: below it if there is room, otherwise
 * above, always inside the window. Follows window resizes, scrolling (also of inner panes) and
 * the panel growing after it opened.
 */
export function useAnchoredPlacement({ panel, anchor, isSheet }: UseAnchoredPlacementOptions) {
  const position = ref<{ left: number; top: number } | null>(null);

  function place(): void {
    const element = panel.value;

    if (!element) return;

    const anchorBox = anchor.value.getBoundingClientRect();
    const width = element.offsetWidth;
    const height = element.offsetHeight;
    const left = Math.max(EDGE, Math.min(anchorBox.left, window.innerWidth - width - EDGE));
    const below = anchorBox.bottom + GAP;
    const fitsBelow = below + height <= window.innerHeight - EDGE;
    const preferred = fitsBelow ? below : anchorBox.top - height - GAP;
    // Also when the anchor sits low on a short window: the panel stays inside it.
    const top = Math.max(EDGE, Math.min(preferred, window.innerHeight - height - EDGE));

    position.value = { left, top };
  }

  useEventListener(window, "resize", place);
  // An inner pane scrolls; the panel follows its anchor.
  useEventListener(window, "scroll", place, { capture: true, passive: true });
  // The content grows after opening (entities load, a criterion opens); stay inside the window.
  useResizeObserver(panel, place);

  const positionStyle = computed(() =>
    isSheet.value || !position.value
      ? undefined
      : { left: `${position.value.left}px`, top: `${position.value.top}px` },
  );

  return { place, positionStyle };
}
