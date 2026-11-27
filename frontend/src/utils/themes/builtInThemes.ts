import { deriveDarkColors } from "@/core/themes/deriveDark";
import type { OwnTheme } from "@/core/themes/ownThemes";
import {
  COLOR_MODE,
  STANDARD_COLORS,
  type CheckedTheme,
  type ColorMode,
  type ThemeColors,
  type ThemeToken,
  type ThemeTokens,
} from "@/core/themes/themeFormat";

import { deriveTokens, withFineTokens } from "./tokens";

/**
 * A theme: a light and a dark version of its colours (one of them may be missing, e.g. a theme that
 * is dark only). Ready-made themes take name and note from the locales
 * (settings.appearance.themes.<id>); own themes bring their own.
 */
export type ThemeDefinition = {
  id: string;
  light: ThemeColors | null;
  dark: ThemeColors | null;
  /** Stronger lines and quiet texts (the Kontrast theme). */
  isStrong: boolean;
  /** Single values on top of the derived ones, per version (prepared pro mode, no UI yet). */
  fineTokens?: Partial<Record<ColorMode, Partial<ThemeTokens>>>;
  /** Own themes only: the name the user gave or the file brought, and its maker. */
  ownName?: string;
  author?: string | null;
};

export const STANDARD_THEME_ID = "standard";

/**
 * Standard is today's HomeAce, value for value, not derived: whoever picks no theme sees no change.
 * styles/tokens.css holds the same values for the first paint (a test keeps both equal).
 */
export const STANDARD_TOKENS: Record<ColorMode, ThemeTokens> = {
  light: {
    "--bg": "#eef0f4",
    "--surface": "#ffffff",
    "--surface-2": "#f6f7fa",
    "--sunken": "#e8ebf1",
    "--line": "#dde1e9",
    "--line-strong": "#c4cad6",
    "--fg": "#161a24",
    "--muted": "#576074",
    "--faint": "#8a92a3",
    "--accent": "#3451d1",
    "--accent-soft": "#e7ebfc",
    "--on-accent": "#ffffff",
    "--flow-when": "#b0620a",
    "--flow-when-soft": "#fcefdc",
    "--flow-if": "#0d7569",
    "--flow-if-soft": "#dcf1ed",
    "--flow-then": "#3451d1",
    "--flow-then-soft": "#e7ebfc",
    "--kind-automation": "#b0620a",
    "--kind-automation-soft": "#fcefdc",
    "--kind-script": "#6b43c2",
    "--kind-script-soft": "#efe9fb",
    "--kind-scene": "#b23a73",
    "--kind-scene-soft": "#fbe6ef",
    "--kind-helper": "#0d7569",
    "--kind-helper-soft": "#dcf1ed",
    "--ok": "#1b7f48",
    "--ok-soft": "#dcf1e4",
    "--warn": "#9f6510",
    "--warn-soft": "#fbefd8",
    "--err": "#bc3434",
    "--err-soft": "#fbe4e4",
    "--scrim": "rgba(14, 18, 28, 0.38)",
    "--shadow": "0 1px 2px rgba(18, 24, 40, 0.06), 0 12px 32px rgba(18, 24, 40, 0.12)",
  },
  dark: {
    "--bg": "#0e1117",
    "--surface": "#161a22",
    "--surface-2": "#1b2029",
    "--sunken": "#11141a",
    "--line": "#262c37",
    "--line-strong": "#3a4250",
    "--fg": "#e6e9f0",
    "--muted": "#9ba3b4",
    "--faint": "#6c7486",
    "--accent": "#8197ff",
    "--accent-soft": "#222b50",
    "--on-accent": "#0e1117",
    "--flow-when": "#f0a54a",
    "--flow-when-soft": "#38270f",
    "--flow-if": "#4cc4b3",
    "--flow-if-soft": "#11322d",
    "--flow-then": "#8197ff",
    "--flow-then-soft": "#222b50",
    "--kind-automation": "#f0a54a",
    "--kind-automation-soft": "#38270f",
    "--kind-script": "#b595f6",
    "--kind-script-soft": "#2b2242",
    "--kind-scene": "#f28dbd",
    "--kind-scene-soft": "#3a1a2a",
    "--kind-helper": "#4cc4b3",
    "--kind-helper-soft": "#11322d",
    "--ok": "#4fcf88",
    "--ok-soft": "#12301e",
    "--warn": "#e5b04e",
    "--warn-soft": "#352812",
    "--err": "#f07777",
    "--err-soft": "#3a191b",
    "--scrim": "rgba(0, 0, 0, 0.55)",
    "--shadow": "0 1px 2px rgba(0, 0, 0, 0.4), 0 14px 36px rgba(0, 0, 0, 0.5)",
  },
};

/**
 * The ready-made themes, in the order the window shows them. Own names, no copies of known
 * palettes; "Wenn", "Und nur wenn" and "Dann" keep their families (orange, teal, blue) in every theme.
 */
export const BUILT_IN_THEMES: readonly ThemeDefinition[] = [
  {
    id: STANDARD_THEME_ID,
    // The base colours of today's look: the start for a copy, and what a file lacks
    light: STANDARD_COLORS.light,
    dark: STANDARD_COLORS.dark,
    isStrong: false,
  },
  {
    id: "fjord",
    light: {
      background: "#eaf0f4",
      surface: "#ffffff",
      text: "#1c2733",
      accent: "#3b6e8f",
      flowWhen: "#a8640f",
      flowIf: "#14756b",
      flowThen: "#3b5bb5",
    },
    dark: {
      background: "#0f151b",
      surface: "#17212b",
      text: "#dde6ee",
      accent: "#7fb2d4",
      flowWhen: "#e6a45a",
      flowIf: "#5cc2b3",
      flowThen: "#8fa8f0",
    },
    isStrong: false,
  },
  {
    id: "forest",
    light: {
      background: "#ecf1e8",
      surface: "#fbfdf8",
      text: "#1f2a1c",
      accent: "#2f6b3a",
      flowWhen: "#a3611a",
      flowIf: "#1d7a6a",
      flowThen: "#3d5ba8",
    },
    dark: {
      background: "#0e140f",
      surface: "#162017",
      text: "#e0ead9",
      accent: "#7cc48a",
      flowWhen: "#e3a560",
      flowIf: "#5ec4ad",
      flowThen: "#91a6ee",
    },
    isStrong: false,
  },
  {
    id: "sand",
    light: {
      background: "#f5efe6",
      surface: "#fffbf5",
      text: "#2e241b",
      accent: "#b4532a",
      flowWhen: "#a8600f",
      flowIf: "#1f7468",
      flowThen: "#4258a8",
    },
    dark: {
      background: "#16110c",
      surface: "#221a13",
      text: "#efe4d6",
      accent: "#e58a5f",
      flowWhen: "#e8a75a",
      flowIf: "#62c1b0",
      flowThen: "#98a9ea",
    },
    isStrong: false,
  },
  {
    id: "midnight",
    light: null,
    dark: {
      background: "#000000",
      surface: "#0b0d12",
      text: "#d7dbe4",
      accent: "#8a9cff",
      flowWhen: "#d9953f",
      flowIf: "#3fb3a3",
      flowThen: "#7f93f5",
    },
    isStrong: false,
  },
  {
    id: "contrast",
    light: {
      background: "#ffffff",
      surface: "#ffffff",
      text: "#000000",
      accent: "#0033cc",
      flowWhen: "#8a4500",
      flowIf: "#005c50",
      flowThen: "#1f3fbf",
    },
    dark: {
      background: "#000000",
      surface: "#000000",
      text: "#ffffff",
      accent: "#ffd400",
      flowWhen: "#ffb347",
      flowIf: "#4fe0cc",
      flowThen: "#9fb4ff",
    },
    isStrong: true,
  },
];

/** Standard: always there, the fallback for an unknown or broken theme. */
export const STANDARD_THEME: ThemeDefinition = BUILT_IN_THEMES[0] ?? {
  id: STANDARD_THEME_ID,
  light: null,
  dark: null,
  isStrong: false,
};

/**
 * The version a theme shows: the wanted one if the theme has it, otherwise the one it has
 * (Mitternacht is dark only).
 */
export function modeOfTheme({
  theme,
  wanted,
}: {
  theme: ThemeDefinition;
  wanted: ColorMode;
}): ColorMode {
  if (theme[wanted]) return wanted;

  return theme.dark ? COLOR_MODE.dark : COLOR_MODE.light;
}

/** Whether the theme has only one version, so the light/dark switch has no say. */
export function hasSingleMode(theme: ThemeDefinition): boolean {
  return !theme.light || !theme.dark;
}

/**
 * Every token of a theme in one version. Standard returns its exact values; the others are derived
 * from their colours, then fine-tuned values are laid on top where they keep the floor.
 *
 * @returns The tokens and the fine values that were dropped for falling below the floor.
 */
export function themeTokens({ theme, mode }: { theme: ThemeDefinition; mode: ColorMode }): {
  tokens: ThemeTokens;
  droppedTokens: ThemeToken[];
} {
  const colors = theme[mode];
  if (theme.id === STANDARD_THEME_ID || !colors) {
    return { tokens: STANDARD_TOKENS[mode], droppedTokens: [] };
  }

  const derived = deriveTokens({ colors, mode, isStrong: theme.isStrong });
  const fineTokens = theme.fineTokens?.[mode] ?? {};

  return withFineTokens({ tokens: derived, fineTokens });
}

/** An own theme (made or imported) as the app shows and applies it. */
export function ownThemeDefinition({ id, theme }: OwnTheme): ThemeDefinition {
  return {
    id,
    light: theme.light,
    dark: theme.dark,
    isStrong: theme.isStrong,
    fineTokens: theme.fineTokens,
    ownName: theme.name,
    author: theme.author,
  };
}

/**
 * Any theme in the shape of a file, for "Exportieren" and "Kopieren".
 *
 * @param name - The shown name; ready-made themes take theirs from the locales.
 */
export function checkedThemeOf({
  theme,
  name,
}: {
  theme: ThemeDefinition;
  name: string;
}): CheckedTheme {
  const dark = theme.dark ?? deriveDarkColors(theme.light ?? STANDARD_COLORS.light);

  return {
    name,
    author: theme.author ?? null,
    light: theme.light,
    dark,
    isStrong: theme.isStrong,
    fineTokens: { light: theme.fineTokens?.light ?? {}, dark: theme.fineTokens?.dark ?? {} },
  };
}
