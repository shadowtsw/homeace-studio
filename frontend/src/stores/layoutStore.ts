import { defineStore } from "pinia";

import { usePreference } from "@/composables/usePreference";
import { NAV_MODE, type NavMode } from "@/constants/entries";
import { DEFAULT_PANE_WIDTHS, PANE_WIDTH_LIMITS, type Pane } from "@/constants/layout";
import { PREFERENCES } from "@/constants/preferences";
import { clampNumber } from "@/utils/number";

/**
 * How the three columns look on this device: widths, the folded detail and folders or areas in the
 * navigation. HomeAce Studio remembers it by itself, so it stays on this device (a phone has other
 * widths than a PC). Settings the user changes on purpose live in the settings store.
 */
export const useLayoutStore = defineStore("layout", () => {
  const paneWidths = usePreference({
    preference: PREFERENCES.paneWidths,
    defaultValue: { ...DEFAULT_PANE_WIDTHS },
    isMergingDefaults: true,
  });
  /** The detail pane folded away for a wider list; opening an entry unfolds it. */
  const isDetailFolded = usePreference({
    preference: PREFERENCES.detailFolded,
    defaultValue: false,
  });
  /** Folders or areas in the tree; stays as the user left it. */
  const navMode = usePreference<NavMode>({
    preference: PREFERENCES.navMode,
    defaultValue: NAV_MODE.folders,
  });

  function setPaneWidth(pane: Pane, width: number): void {
    const limits = PANE_WIDTH_LIMITS[pane];
    const clampedWidth = clampNumber(width, limits.min, limits.max);
    paneWidths.value = { ...paneWidths.value, [pane]: clampedWidth };
  }

  function resetPaneWidth(pane: Pane): void {
    setPaneWidth(pane, DEFAULT_PANE_WIDTHS[pane]);
  }

  function resetPaneWidths(): void {
    paneWidths.value = { ...DEFAULT_PANE_WIDTHS };
  }

  return {
    paneWidths,
    isDetailFolded,
    navMode,
    setPaneWidth,
    resetPaneWidth,
    resetPaneWidths,
  };
});
