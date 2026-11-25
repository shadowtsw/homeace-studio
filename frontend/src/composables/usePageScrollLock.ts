import { useEventListener } from "@vueuse/core";
import type { Ref } from "vue";

type PageScrollLockOptions = {
  /** The open panel (picker, search) that is fixed in the window. */
  panel: Ref<HTMLElement | null>;
  /** Its own list that may still scroll, as a CSS selector inside the panel. */
  scrollable: string;
};

/**
 * While a fixed panel is open, the page behind it does not scroll with the wheel or a finger: a mouse
 * that slips off the panel's list would otherwise move the page while the panel stays where it is
 * (owner's feedback on dummy v34). Only the panel's own list scrolls; give it
 * `overscroll-behavior: contain`, so it does not hand the scroll on to the page at its ends.
 * Scrolling by scrollbar or keyboard is not blocked; the panel closes on that as before.
 */
export function usePageScrollLock({ panel, scrollable }: PageScrollLockOptions): void {
  function block(event: Event): void {
    const target = event.target as Element | null;
    const list = target?.closest?.(scrollable);
    const isOwnList = list !== null && list !== undefined && panel.value?.contains(list) === true;
    if (!isOwnList) event.preventDefault();
  }

  const options = { capture: true, passive: false };
  useEventListener(document, "wheel", block, options);
  useEventListener(document, "touchmove", block, options);
}
