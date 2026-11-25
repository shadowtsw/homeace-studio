import { defineStore } from "pinia";

import { usePreference } from "@/composables/usePreference";
import { PREFERENCES } from "@/constants/preferences";
import { DEFAULT_STORED_TRACES } from "@/constants/traces";
import { preferredLocale, type AppLocale } from "@/i18n";

/**
 * Settings the user changes on purpose. They follow the user (scope "user"): kept in the browser for
 * now, later per HA user in the overlay. How the columns look lives in the layout store.
 */
export const useSettingsStore = defineStore("settings", () => {
  /** Off by default: entity IDs, storage badges and API names would put beginners off. */
  const isTechnicalDetailsVisible = usePreference({
    preference: PREFERENCES.technicalDetails,
    defaultValue: false,
  });
  /**
   * The user's choice wins; without one, the browser language. Not written to storage until the
   * user picks a language, so a later change of the browser language still counts.
   */
  const browserLanguages = typeof navigator === "undefined" ? [] : navigator.languages;
  const locale = usePreference<AppLocale>({
    preference: PREFERENCES.locale,
    defaultValue: preferredLocale(browserLanguages),
    isWritingDefaults: false,
  });
  /** Scenes save shortly after the last edit; off by default, saving stays a deliberate step. */
  const isSceneAutoSave = usePreference({
    preference: PREFERENCES.sceneAutoSave,
    defaultValue: false,
  });

  /** New automations and scripts keep this many runs; HA's own default keeps their config clean. */
  const storedTraces = usePreference<number>({
    preference: PREFERENCES.storedTraces,
    defaultValue: DEFAULT_STORED_TRACES,
  });

  return {
    isTechnicalDetailsVisible,
    locale,
    isSceneAutoSave,
    storedTraces,
  };
});
