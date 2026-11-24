/** Class of the short highlight animation in base.css. */
export const FLASH_CLASS = "is-flashing";

/** Two pulses of about a second each, then the class goes away again. */
const FLASH_MS = 2400;

/**
 * Lets an element light up briefly, e.g. what "Zeigen" in "Was ist neu" points at.
 * Does nothing without an element.
 */
export function flashElement(element: Element | null): void {
  if (!element) return;

  element.classList.remove(FLASH_CLASS);
  // Reading the layout restarts the animation when the same element flashes again.
  void (element as HTMLElement).offsetWidth;
  element.classList.add(FLASH_CLASS);
  window.setTimeout(() => element.classList.remove(FLASH_CLASS), FLASH_MS);
}
