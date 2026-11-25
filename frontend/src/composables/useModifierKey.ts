import { computed, type ComputedRef } from "vue";
import { useI18n } from "vue-i18n";

/** The Command key's symbol, the same on every Mac keyboard. */
const MAC_MODIFIER_KEY = "⌘";

/**
 * The key that adds to a click: ⌘ on a Mac (there Ctrl+click is the right-click), else "Strg" or
 * "Ctrl" in the user's language. For texts like "Strg + Klick".
 */
export function useModifierKey(): ComputedRef<string> {
  const { t } = useI18n();
  // navigator.platform is old but still the simplest check that works in every browser.
  const isMac = typeof navigator !== "undefined" && /Mac|iPhone|iPad/.test(navigator.platform);
  return computed(() => (isMac ? MAC_MODIFIER_KEY : t("scopeMenu.ctrl")));
}
