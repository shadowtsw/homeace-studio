import { ref, type Ref } from "vue";

const GAP = 6;
const MARGIN = 12;
/** Below this the panel flips to the other side instead of getting even shorter. */
const MIN_HEIGHT = 200;

type Side = "below" | "above";

/**
 * Until when a panel scrolls its field itself. Shared by all panels: the icon search inside the label
 * picker scrolls too, and the label picker must not take that for the user scrolling away.
 */
let ownScrollUntil = 0;

export type UseNoCoverPlacementOptions = {
  field: Ref<HTMLElement | null>;
  panel: Ref<HTMLElement | null>;
};

/**
 * Places a fixed panel next to a field it must never cover (the chips of the label picker): below
 * it, else above it; when neither fits, the field's scroll container moves it up and the panel opens
 * below, shorter if need be. Called again after the field grew (a new chip row), the panel stays on
 * its side and gets shorter before it flips. Unchanged, it stays still.
 */
export function useNoCoverPlacement({ field, panel }: UseNoCoverPlacementOptions) {
  const style = ref<Record<string, string>>({});
  let side: Side | null = null;

  function place(): void {
    const fieldEl = field.value;
    const panelEl = panel.value;
    if (!fieldEl || !panelEl) return;

    // Still clear of the field: stay where it is
    let box = fieldEl.getBoundingClientRect();
    const current = panelEl.getBoundingClientRect();
    const covers = current.top < box.bottom + GAP && current.bottom > box.top - GAP;
    if (side && !covers) return;

    // Grown into it: stay on the same side and get shorter, if there is enough room left
    const roomBelow = window.innerHeight - MARGIN - (box.bottom + GAP);
    const roomAbove = box.top - GAP - MARGIN;
    if (side === "below" && roomBelow >= MIN_HEIGHT) return setBelow({ box, room: roomBelow });
    if (side === "above" && roomAbove >= MIN_HEIGHT)
      return setAbove({ box, room: roomAbove, height: current.height });

    // First placement: below, else above, else scroll the field up and open below
    const height = panelEl.scrollHeight;
    if (height <= roomBelow) return setBelow({ box, room: roomBelow });
    if (height <= roomAbove) return setAbove({ box, room: roomAbove, height });

    // Up to the top of its scroll area, not of the window: above it there may be a fixed header
    // (the detail's), which would then cover the field
    const scroller = scrollParentOf(fieldEl);
    // Nothing to scroll (inside a fixed panel): the side with more room, shorter
    if (!scroller) {
      if (roomAbove > roomBelow) return setAbove({ box, room: roomAbove, height });
      return setBelow({ box, room: roomBelow });
    }
    ownScrollUntil = Date.now() + 600;
    scroller.scrollTop += box.top - (scroller.getBoundingClientRect().top + GAP);
    box = fieldEl.getBoundingClientRect();
    setBelow({ box, room: window.innerHeight - MARGIN - (box.bottom + GAP) });
  }

  function setBelow({ box, room }: { box: DOMRect; room: number }): void {
    side = "below";
    style.value = { ...horizontal(box), top: `${box.bottom + GAP}px`, maxHeight: `${room}px` };
  }

  function setAbove({ box, room, height }: { box: DOMRect; room: number; height: number }): void {
    side = "above";
    const shown = Math.min(height, room);
    style.value = { ...horizontal(box), top: `${box.top - GAP - shown}px`, maxHeight: `${room}px` };
  }

  function horizontal(box: DOMRect): Record<string, string> {
    const width = panel.value?.getBoundingClientRect().width ?? 340;
    const left = Math.min(Math.max(MARGIN, box.left), window.innerWidth - width - MARGIN);

    return { left: `${left}px` };
  }

  return {
    style,
    place,
    /** True for a moment after we scrolled the field ourselves. */
    isOwnScroll: (): boolean => Date.now() < ownScrollUntil,
    reset: (): void => {
      side = null;
    },
  };
}

/**
 * The area that scrolls the field; null inside a fixed panel (the icon field in the label picker):
 * scrolling the page behind would not move the field, only the page.
 */
function scrollParentOf(element: HTMLElement): HTMLElement | null {
  for (let parent = element.parentElement; parent; parent = parent.parentElement) {
    const { overflowY, position } = getComputedStyle(parent);
    if (position === "fixed") return null;
    if (
      (overflowY === "auto" || overflowY === "scroll") &&
      parent.scrollHeight > parent.clientHeight
    )
      return parent;
  }
  return null;
}
