import { useLocalStorage } from "@vueuse/core";
import { defineStore } from "pinia";

import { NAV_MODE, type NavMode } from "@/constants/entries";
import { DEFAULT_PANE_WIDTHS, PANE_WIDTH_LIMITS, type Pane } from "@/constants/layout";
import { preferredLocale, type AppLocale } from "@/i18n";
import { clampNumber } from "@/utils/number";

const STORAGE_KEY = {
  technicalDetails: "homeace.technicalDetails",
  paneWidths: "homeace.paneWidths",
  locale: "homeace.locale",
  navMode: "homeace.navMode",
  detailFolded: "homeace.detailFolded",
} as const;

/**
 * Per-viewer UI settings. Kept in the browser for now; later stored per HA user in the overlay.
 */
export const useSettingsStore = defineStore("settings", () => {
  /** Off by default: entity IDs, storage badges and API names would put beginners off. */
  const isTechnicalDetailsVisible = useLocalStorage(STORAGE_KEY.technicalDetails, false);
  const paneWidths = useLocalStorage(
    STORAGE_KEY.paneWidths,
    { ...DEFAULT_PANE_WIDTHS },
    { mergeDefaults: true },
  );
  /**
   * The user's choice wins; without one, the browser language. Not written to storage until the
   * user picks a language, so a later change of the browser language still counts.
   */
  const locale = useLocalStorage<AppLocale>(
    STORAGE_KEY.locale,
    preferredLocale(typeof navigator === "undefined" ? [] : navigator.languages),
    { writeDefaults: false },
  );
  /** Folders or areas in the tree; stays as the user left it. */
  const navMode = useLocalStorage<NavMode>(STORAGE_KEY.navMode, NAV_MODE.folders);
  /** The detail pane folded away for a wider list; opening an entry unfolds it. */
  const isDetailFolded = useLocalStorage(STORAGE_KEY.detailFolded, false);

  function setPaneWidth(pane: Pane, width: number): void {
    const limits = PANE_WIDTH_LIMITS[pane];
    paneWidths.value = { ...paneWidths.value, [pane]: clampNumber(width, limits.min, limits.max) };
  }

  function resetPaneWidth(pane: Pane): void {
    setPaneWidth(pane, DEFAULT_PANE_WIDTHS[pane]);
  }

  function resetPaneWidths(): void {
    paneWidths.value = { ...DEFAULT_PANE_WIDTHS };
  }

  return {
    isTechnicalDetailsVisible,
    paneWidths,
    locale,
    navMode,
    isDetailFolded,
    setPaneWidth,
    resetPaneWidth,
    resetPaneWidths,
  };
});
