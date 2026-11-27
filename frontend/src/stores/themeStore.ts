import { useMediaQuery } from "@vueuse/core";
import { defineStore } from "pinia";
import { computed, ref, watch, watchEffect } from "vue";

import { usePreference } from "@/composables/usePreference";
import { PREFERENCES } from "@/constants/preferences";
import { useOwnThemesStore } from "@/stores/ownThemesStore";
import {
  BUILT_IN_THEMES,
  STANDARD_THEME,
  STANDARD_THEME_ID,
  hasSingleMode,
  modeOfTheme,
  themeTokens,
  type ThemeDefinition,
} from "@/utils/themes/builtInThemes";
import {
  COLOR_MODE,
  THEME_TOKENS,
  type ColorMode,
  type ThemeTokens,
} from "@/core/themes/themeFormat";

/** The brightness switch: a fixed version, or whatever the device's system says. */
export const COLOR_MODE_CHOICE = { ...COLOR_MODE, system: "system" } as const;
export type ColorModeChoice = (typeof COLOR_MODE_CHOICE)[keyof typeof COLOR_MODE_CHOICE];
export const COLOR_MODE_CHOICES: readonly ColorModeChoice[] = [
  COLOR_MODE_CHOICE.light,
  COLOR_MODE_CHOICE.dark,
  COLOR_MODE_CHOICE.system,
];

const PREFERS_DARK_QUERY = "(prefers-color-scheme: dark)";
/**
 * `…?theme=standard` in the address is the way back when a theme went wrong. It works on the
 * direct port and in a new tab; inside the HA panel the floor keeps every theme readable.
 */
const ESCAPE_PARAMETER = "theme";

function isColorModeChoice(value: unknown): value is ColorModeChoice {
  return COLOR_MODE_CHOICES.some((choice) => choice === value);
}

function hasEscapeParameter(): boolean {
  if (typeof window === "undefined") return false;

  const parameters = new URLSearchParams(window.location.search);
  return parameters.get(ESCAPE_PARAMETER) === STANDARD_THEME_ID;
}

/** Every colour of the theme on <html>, so every component's `var(--…)` follows at once. */
function applyTokens({ tokens, mode }: { tokens: ThemeTokens; mode: ColorMode }): void {
  if (typeof document === "undefined") return;

  const rootStyle = document.documentElement.style;
  for (const token of THEME_TOKENS) rootStyle.setProperty(token, tokens[token]);
  // Scrollbars and form controls of the browser follow too
  rootStyle.colorScheme = mode;
}

/**
 * The theme and its brightness. The theme follows the user (scope "user"), the brightness stays on
 * the device: "Was du bewusst einstellst, folgt dir – außer es hängt vom Gerät ab."
 */
export const useThemeStore = defineStore("theme", () => {
  const storedThemeId = usePreference<string>({
    preference: PREFERENCES.theme,
    defaultValue: STANDARD_THEME_ID,
  });
  const storedModeChoice = usePreference<ColorModeChoice>({
    preference: PREFERENCES.colorMode,
    defaultValue: COLOR_MODE_CHOICE.system,
  });
  const prefersDark = useMediaQuery(PREFERS_DARK_QUERY);
  const ownThemes = useOwnThemesStore();

  // The theme in use: an unknown or broken one (deleted, another device's newer one) is Standard
  const allThemes = computed(() => [...BUILT_IN_THEMES, ...ownThemes.themes]);
  const theme = computed<ThemeDefinition>(
    () => allThemes.value.find((entry) => entry.id === storedThemeId.value) ?? STANDARD_THEME,
  );
  const modeChoice = computed<ColorModeChoice>(() =>
    isColorModeChoice(storedModeChoice.value) ? storedModeChoice.value : COLOR_MODE_CHOICE.system,
  );
  const wantedMode = computed<ColorMode>(() => {
    if (modeChoice.value !== COLOR_MODE_CHOICE.system) return modeChoice.value;

    return prefersDark.value ? COLOR_MODE.dark : COLOR_MODE.light;
  });
  /** The version shown: a theme with one version only (Mitternacht) shows that one. */
  const mode = computed(() => modeOfTheme({ theme: theme.value, wanted: wantedMode.value }));
  /** The brightness switch has no say for a theme with one version only. */
  const isModeLocked = computed(() => hasSingleMode(theme.value));
  const tokens = computed(() => themeTokens({ theme: theme.value, mode: mode.value }).tokens);

  // The way back: Standard for this visit, also over a value the backend brings later
  const isEscapeActive = ref(hasEscapeParameter());
  watch(
    storedThemeId,
    (themeId) => {
      if (isEscapeActive.value && themeId !== STANDARD_THEME_ID) {
        storedThemeId.value = STANDARD_THEME_ID;
      }
    },
    { immediate: true },
  );

  watchEffect(() => applyTokens({ tokens: tokens.value, mode: mode.value }));

  function selectTheme(themeId: string): void {
    isEscapeActive.value = false;
    storedThemeId.value = themeId;
  }

  function selectModeChoice(choice: ColorModeChoice): void {
    storedModeChoice.value = choice;
  }

  /** How another theme would look right now, for its card. */
  function previewTokens(candidate: ThemeDefinition): ThemeTokens {
    const candidateMode = modeOfTheme({ theme: candidate, wanted: wantedMode.value });
    return themeTokens({ theme: candidate, mode: candidateMode }).tokens;
  }

  return {
    theme,
    modeChoice,
    mode,
    isModeLocked,
    selectTheme,
    selectModeChoice,
    previewTokens,
  };
});
