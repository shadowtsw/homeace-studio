import { useEventListener } from "@vueuse/core";
import type { Ref } from "vue";

type CloseWhenFieldScrollsOptions = {
  /** The field the fixed panel belongs to. */
  field: Ref<HTMLElement | null>;
  /** True while the panel scrolls the field into view itself. */
  isOwnScroll: () => boolean;
  onClose: () => void;
};

/**
 * A fixed panel closes when its field scrolls away (scrollbar, keyboard; the wheel is locked by
 * usePageScrollLock). Only a scroll that moves the field counts: the page or an area around the
 * field. A text field scrolling its own long text elsewhere does not; counting every scroll closed
 * the label picker now and then for no visible reason (owner's feedback).
 */
export function useCloseWhenFieldScrolls({
  field,
  isOwnScroll,
  onClose,
}: CloseWhenFieldScrollsOptions): void {
  function onScroll(event: Event): void {
    const target = event.target;
    const movesField =
      target === document ||
      (target instanceof Node && Boolean(field.value && target.contains(field.value)));
    if (movesField && !isOwnScroll()) onClose();
  }

  useEventListener(document, "scroll", onScroll, { capture: true, passive: true });
}
