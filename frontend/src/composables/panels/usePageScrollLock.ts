import { useEventListener } from "@vueuse/core";

/**
 * Put this attribute on the list inside an open panel that may still scroll. An attribute instead of
 * a selector per panel, because panels nest (the icon search inside the label picker) and each lock
 * must let the other's list scroll.
 */
export const OWN_SCROLL_ATTRIBUTE = "data-own-scroll";

/**
 * While a fixed panel is open, the page behind it does not scroll with the wheel or a finger: a mouse
 * that slips off the panel's list would otherwise move the page while the panel stays where it is
 * (owner's feedback on dummy v34). Only lists marked with OWN_SCROLL_ATTRIBUTE scroll; give them
 * `overscroll-behavior: contain`, so they do not hand the scroll on to the page at their ends.
 * Scrolling by scrollbar or keyboard is not blocked; the panels close on that as before.
 */
export function usePageScrollLock(): void {
  function block(event: Event): void {
    const target = event.target as Element | null;
    const isOwnList = Boolean(target?.closest?.(`[${OWN_SCROLL_ATTRIBUTE}]`));
    if (!isOwnList) event.preventDefault();
  }

  const options = { capture: true, passive: false };
  useEventListener(document, "wheel", block, options);
  useEventListener(document, "touchmove", block, options);
}
