import { defineStore } from "pinia";
import { computed, ref, watch } from "vue";

import { SETTINGS_SUB_PAGE } from "@/constants/settings";
import { cleanText } from "@/core/themes/checkTheme";
import { isHexColor } from "@/core/themes/color";
import { deriveDarkColors } from "@/core/themes/deriveDark";
import {
  COLOR_MODE,
  MAX_THEME_NAME_LENGTH,
  STANDARD_COLORS,
  THEME_COLOR_KEYS,
  type CheckedTheme,
  type ColorMode,
  type FineTokens,
  type ThemeColorKey,
  type ThemeColors,
  type ThemeTokens,
} from "@/core/themes/themeFormat";
import { useOwnThemesStore } from "@/stores/ownThemesStore";
import { useSettingsWindowStore } from "@/stores/settingsWindowStore";
import { useThemeStore } from "@/stores/themeStore";
import {
  STANDARD_THEME_ID,
  STANDARD_TOKENS,
  themeTokens,
  type ThemeDefinition,
} from "@/utils/themes/builtInThemes";
import { contrastChecks, withSuggestion, type ContrastCheck } from "@/utils/themes/contrastChecks";
import { floorFindings, type ThemeReportLine } from "@/utils/themes/floorReport";

/** What the editor works on until "Speichern" or "Verwerfen". */
export type EditorDraft = {
  /** The own theme being changed; null for a new one (made from scratch or as a copy). */
  ownId: string | null;
  /** A new theme: the ready-made one it starts from; null when an own theme is changed. */
  startId: string | null;
  name: string;
  author: string | null;
  /** null: the theme is dark only (a copy of Mitternacht). */
  light: ThemeColors | null;
  /** The hand-made dark version; not used while it is derived. */
  dark: ThemeColors;
  /** "Dunkel automatisch ableiten". */
  isDarkDerived: boolean;
  isStrong: boolean;
  /** Fine-tuned values of an imported theme stay as they are (no UI yet). */
  fineTokens: FineTokens;
};

/** How a draft starts: a new theme from a ready-made one, or an own theme to change. */
export type EditorStart =
  { kind: "new"; theme: ThemeDefinition; name: string } | { kind: "edit"; theme: ThemeDefinition };

export type SavedTheme = { name: string; findings: ThemeReportLine[] };

/** The draft is no stored theme yet; its previews use this id. */
const DRAFT_ID = "draft";

function sameColors(colors: ThemeColors, other: ThemeColors): boolean {
  return THEME_COLOR_KEYS.every((key) => colors[key] === other[key]);
}

/** Own colours for the draft, so editing never changes the theme it started from. */
function copyOf(colors: ThemeColors | null): ThemeColors | null {
  if (!colors) return null;

  return { ...colors };
}

/**
 * The draft from a theme. A new theme from Standard derives its dark version (like the dummy); a
 * copy of another ready-made theme keeps its hand-made one. An own theme derives it when its dark
 * version is exactly the derived one, so no extra field is needed in the file.
 */
function draftFrom(start: EditorStart): EditorDraft {
  const { theme } = start;
  const light = theme.light;
  const dark = theme.dark ?? deriveDarkColors(light ?? STANDARD_COLORS.light);
  const isFromStandard = start.kind === "new" && theme.id === STANDARD_THEME_ID;
  const isExactlyDerived = light !== null && sameColors(dark, deriveDarkColors(light));
  const isEdit = start.kind === "edit";
  const name = start.kind === "edit" ? (theme.ownName ?? "") : start.name;

  return {
    ownId: isEdit ? theme.id : null,
    startId: isEdit ? null : theme.id,
    name,
    author: theme.author ?? null,
    light: copyOf(light),
    dark: { ...dark },
    isDarkDerived: light !== null && (isFromStandard || isExactlyDerived),
    isStrong: theme.isStrong,
    fineTokens: { light: theme.fineTokens?.light ?? {}, dark: theme.fineTokens?.dark ?? {} },
  };
}

/**
 * The theme editor: four base colours and the three flow colours per version, the rest derived. The
 * draft lives here until "Speichern" or "Verwerfen", so going back or switching tabs loses nothing;
 * closing the settings window drops it. Only the previews show it, never the whole app.
 */
export const useThemeEditorStore = defineStore("themeEditor", () => {
  const settingsWindow = useSettingsWindowStore();
  const ownThemes = useOwnThemesStore();
  const themeStore = useThemeStore();

  const draft = ref<EditorDraft | null>(null);
  /** The draft as it started, to tell whether anything changed. */
  const startedAs = ref("");
  const editMode = ref<ColorMode>(COLOR_MODE.light);
  const isPhonePreviewShown = ref(false);
  const isSaving = ref(false);

  // What the draft looks like
  const darkColors = computed<ThemeColors | null>(() => {
    const current = draft.value;
    if (!current) return null;
    if (current.isDarkDerived && current.light) return deriveDarkColors(current.light);

    return current.dark;
  });
  /** The version being edited; a dark-only theme has only dark. */
  const shownMode = computed<ColorMode>(() =>
    draft.value?.light ? editMode.value : COLOR_MODE.dark,
  );
  const editedColors = computed<ThemeColors | null>(() => {
    if (shownMode.value === COLOR_MODE.dark) return darkColors.value;

    return draft.value?.light ?? null;
  });
  /** The dark fields only show the derived values while "Dunkel automatisch ableiten" is on. */
  const isEditedDerived = computed(
    () => shownMode.value === COLOR_MODE.dark && Boolean(draft.value?.isDarkDerived),
  );
  /** The draft as a theme, for the previews. */
  const definition = computed<ThemeDefinition | null>(() => {
    const current = draft.value;
    if (!current || !darkColors.value) return null;

    return {
      id: DRAFT_ID,
      light: current.light,
      dark: darkColors.value,
      isStrong: current.isStrong,
      fineTokens: current.fineTokens,
      ownName: current.name,
      author: current.author,
    };
  });
  /** The draft in the version being edited, for both previews (in the editor and beside it). */
  const previewTokens = computed<ThemeTokens>(() => {
    if (!definition.value) return STANDARD_TOKENS.light;

    return themeTokens({ theme: definition.value, mode: shownMode.value }).tokens;
  });
  const checks = computed<ContrastCheck[]>(() =>
    editedColors.value ? contrastChecks(editedColors.value) : [],
  );
  const isDirty = computed(
    () => Boolean(draft.value) && JSON.stringify(draft.value) !== startedAs.value,
  );

  // Starting, resuming, leaving
  async function open(start: EditorStart): Promise<void> {
    draft.value = draftFrom(start);
    startedAs.value = JSON.stringify(draft.value);
    editMode.value = COLOR_MODE.light;
    await settingsWindow.openSubPage(SETTINGS_SUB_PAGE.themeEditor);
  }

  /** "Weiter bearbeiten" on "Aussehen": back to the draft that was left. */
  async function resume(): Promise<void> {
    if (draft.value) await settingsWindow.openSubPage(SETTINGS_SUB_PAGE.themeEditor);
  }

  /** A new draft takes the colours of another start theme; its name stays as typed. */
  function changeStart(theme: ThemeDefinition): void {
    const current = draft.value;
    if (!current || current.ownId) return;

    draft.value = draftFrom({ kind: "new", theme, name: current.name });
  }

  function discard(): void {
    draft.value = null;
    startedAs.value = "";
  }

  // Editing
  function setName(name: string): void {
    if (draft.value) draft.value.name = name;
  }

  function setEditMode(mode: ColorMode): void {
    editMode.value = mode;
  }

  /** Only a #rrggbb value is taken; anything else the field shows as invalid. */
  function setColor({ key, value }: { key: ThemeColorKey; value: string }): void {
    const current = draft.value;
    if (!current || !isHexColor(value) || isEditedDerived.value) return;

    const colors = shownMode.value === COLOR_MODE.light ? current.light : current.dark;
    if (colors) colors[key] = value.toLowerCase();
  }

  /** Switching it off starts the hand-made dark version from what was derived. */
  function setDarkDerived(isDerived: boolean): void {
    const current = draft.value;
    if (!current?.light) return;

    if (!isDerived && darkColors.value) current.dark = { ...darkColors.value };
    current.isDarkDerived = isDerived;
  }

  /** "Vorschlag übernehmen" for one check of the version being edited. */
  function applySuggestion(check: ContrastCheck): void {
    const current = draft.value;
    const colors = editedColors.value;
    if (!current || !colors || isEditedDerived.value) return;

    const suggested = withSuggestion({ colors, check });
    if (shownMode.value === COLOR_MODE.light) current.light = suggested;
    else current.dark = suggested;
  }

  /**
   * "Speichern": a new theme is added, an own one replaced; it is put on afterwards. Colours below
   * the floor stay as they are; the floor adjusts them on the page, and the findings say so.
   *
   * @param fallbackName - The name for a draft whose name field is empty, in the user's language.
   */
  async function save(fallbackName: string): Promise<SavedTheme | null> {
    const current = draft.value;
    if (!current || !darkColors.value || isSaving.value) return null;

    isSaving.value = true;
    try {
      // The theme as the file format has it
      const typedName = cleanText({ text: current.name, maxLength: MAX_THEME_NAME_LENGTH });
      const theme: CheckedTheme = {
        name: typedName || fallbackName,
        author: current.author,
        light: current.light,
        dark: darkColors.value,
        isStrong: current.isStrong,
        fineTokens: current.fineTokens,
      };

      // Stored, put on, and the editor left
      const saved = await storeTheme({ ownId: current.ownId, theme });
      themeStore.selectTheme(saved.id);
      discard();
      settingsWindow.back();
      return { name: saved.name, findings: floorFindings(theme) };
    } finally {
      isSaving.value = false;
    }
  }

  async function storeTheme({
    ownId,
    theme,
  }: {
    ownId: string | null;
    theme: CheckedTheme;
  }): Promise<{ id: string; name: string }> {
    if (!ownId) return ownThemes.add(theme);

    const name = await ownThemes.update({ id: ownId, theme });
    return { id: ownId, name };
  }

  // Closing the settings window drops a draft that was left
  watch(
    () => settingsWindow.isOpen,
    (isOpen) => {
      if (!isOpen) discard();
    },
  );

  return {
    draft,
    editMode,
    shownMode,
    editedColors,
    isEditedDerived,
    definition,
    previewTokens,
    checks,
    isDirty,
    isPhonePreviewShown,
    isSaving,
    open,
    resume,
    changeStart,
    discard,
    setName,
    setEditMode,
    setColor,
    setDarkDerived,
    applySuggestion,
    save,
  };
});
