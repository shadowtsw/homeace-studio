import { defineStore } from "pinia";
import { computed, ref } from "vue";

import { SETTINGS_SUB_PAGE } from "@/constants/settings";
import { useOwnThemesStore, type AddedTheme } from "@/stores/ownThemesStore";
import { useSettingsWindowStore } from "@/stores/settingsWindowStore";
import { useThemeStore } from "@/stores/themeStore";
import { floorFindings, type ThemeReportLine } from "@/utils/themes/floorReport";
import { runThemeGate, runThemeGateOnFile, type GateResult } from "@/utils/themes/themeGate";

/** Where the import stands: text to paste, the gate at work, or its result. */
export const IMPORT_STAGE = {
  paste: "paste",
  checking: "checking",
  result: "result",
} as const;
export type ImportStage = (typeof IMPORT_STAGE)[keyof typeof IMPORT_STAGE];

/**
 * Importing a theme, never silently: a file or pasted text goes through the gate, the page shows a
 * preview with the check report, and only "Übernehmen" keeps it under "Meine Themes". The page is
 * a step below "Aussehen" in the settings window.
 */
export const useThemeImportStore = defineStore("themeImport", () => {
  const settingsWindow = useSettingsWindowStore();
  const ownThemes = useOwnThemesStore();
  const themeStore = useThemeStore();

  const stage = ref<ImportStage>(IMPORT_STAGE.paste);
  const text = ref("");
  const result = ref<GateResult | null>(null);
  const isTaking = ref(false);
  /** A theme file's text where the clipboard is closed: the copy page shows it to select. */
  const copyFileText = ref("");

  /** The gate's findings and what the floor will do, in one report. */
  const report = computed<ThemeReportLine[]>(() => {
    const current = result.value;
    if (!current) return [];
    if (!current.isValid) return current.report;

    return [...current.report, ...floorFindings(current.theme)];
  });

  /** "Text einfügen": an empty field on the import page. */
  async function startPaste(): Promise<void> {
    stage.value = IMPORT_STAGE.paste;
    text.value = "";
    result.value = null;
    await settingsWindow.openSubPage(SETTINGS_SUB_PAGE.themeImport);
  }

  async function checkText(): Promise<void> {
    stage.value = IMPORT_STAGE.checking;
    result.value = await runThemeGate({ text: text.value });
    stage.value = IMPORT_STAGE.result;
  }

  /** "Datei importieren": the chosen file goes straight into the gate. */
  async function checkFile(file: Blob): Promise<void> {
    stage.value = IMPORT_STAGE.checking;
    text.value = "";
    result.value = null;
    await settingsWindow.openSubPage(SETTINGS_SUB_PAGE.themeImport);
    result.value = await runThemeGateOnFile(file);
    stage.value = IMPORT_STAGE.result;
  }

  /** Back from the result to the text (after a pasted text did not pass). */
  function editText(): void {
    stage.value = IMPORT_STAGE.paste;
    result.value = null;
  }

  /**
   * "Übernehmen": keeps the theme under "Meine Themes" and puts it on.
   *
   * @param fallbackName - The name for a theme whose file brought none, in the user's language.
   * @returns The new theme's name (a taken name gets " (2)"), or null when there is nothing to take.
   */
  async function take(fallbackName: string): Promise<AddedTheme | null> {
    const current = result.value;
    if (!current?.isValid || isTaking.value) return null;

    isTaking.value = true;
    try {
      const theme = { ...current.theme, name: current.theme.name || fallbackName };
      const added = await ownThemes.add(theme);
      themeStore.selectTheme(added.id);
      settingsWindow.back();
      return added;
    } finally {
      isTaking.value = false;
    }
  }

  /** "Kopieren" where the clipboard is closed: a page with the text to select by hand. */
  async function showCopyText(fileText: string): Promise<void> {
    copyFileText.value = fileText;
    await settingsWindow.openSubPage(SETTINGS_SUB_PAGE.themeCopy);
  }

  return {
    stage,
    text,
    result,
    report,
    isTaking,
    copyFileText,
    startPaste,
    checkText,
    checkFile,
    editText,
    take,
    showCopyText,
  };
});
