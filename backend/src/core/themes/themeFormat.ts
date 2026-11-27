// Copied from core/themes/themeFormat.ts by scripts/sync-core.mjs. Edit it there and run the script.
/**
 * The theme model and its file format, the same in the frontend and the backend. A theme file is
 * `<name>.homeace-theme.json`:
 *
 *   { "homeace-theme": 1, "name": "Abendrot", "author": "Sabine",
 *     "light": { "background": "#fbf6f1", "surface": "#ffffff", "text": "#2b211c",
 *                "accent": "#c2552d", "flowWhen": "#b0620a", "flowIf": "#0d7569",
 *                "flowThen": "#3451d1" },
 *     "dark": { … the same seven … }, "strong": false,
 *     "fineTokens": { "light": { "--line": "#e0d6cc" }, "dark": {} } }
 *
 * Without "light" a theme is dark only. English field names: files are shared in forums worldwide.
 */

export const THEME_FILE_MARKER = "homeace-theme";
/** Raised when the format changes; older files are converted, newer ones refused. */
export const THEME_FILE_VERSION = 1;
export const THEME_FILE_EXTENSION = ".homeace-theme.json";
/** A theme is a few hundred bytes; anything this large is no theme. */
export const MAX_THEME_TEXT_LENGTH = 65_536;
export const MAX_THEME_NAME_LENGTH = 40;

export const COLOR_MODE = { light: "light", dark: "dark" } as const;
export type ColorMode = (typeof COLOR_MODE)[keyof typeof COLOR_MODE];
export const COLOR_MODES: readonly ColorMode[] = [COLOR_MODE.light, COLOR_MODE.dark];

/** Every colour variable of the app's styles/tokens.css. A theme sets all of them. */
export const THEME_TOKENS = [
  "--bg",
  "--surface",
  "--surface-2",
  "--sunken",
  "--line",
  "--line-strong",
  "--fg",
  "--muted",
  "--faint",
  "--accent",
  "--accent-soft",
  "--on-accent",
  "--flow-when",
  "--flow-when-soft",
  "--flow-if",
  "--flow-if-soft",
  "--flow-then",
  "--flow-then-soft",
  "--kind-automation",
  "--kind-automation-soft",
  "--kind-script",
  "--kind-script-soft",
  "--kind-scene",
  "--kind-scene-soft",
  "--kind-helper",
  "--kind-helper-soft",
  "--ok",
  "--ok-soft",
  "--warn",
  "--warn-soft",
  "--err",
  "--err-soft",
  "--scrim",
  "--shadow",
] as const;

export type ThemeToken = (typeof THEME_TOKENS)[number];
export type ThemeTokens = Record<ThemeToken, string>;

/** Tokens a fine-tuned value may set: the plain colours (not the overlay shade and the shadow). */
export const FINE_TOKENS: readonly ThemeToken[] = THEME_TOKENS.filter(
  (token) => token !== "--scrim" && token !== "--shadow",
);

/**
 * What a theme version is made of: four base colours and the colours of the flow sections
 * ("Wenn", "Und nur wenn", "Dann"). Every other token is derived from them.
 */
export const THEME_COLOR_KEYS = [
  "background",
  "surface",
  "text",
  "accent",
  "flowWhen",
  "flowIf",
  "flowThen",
] as const;

export type ThemeColorKey = (typeof THEME_COLOR_KEYS)[number];
export type ThemeColors = Record<ThemeColorKey, string>;

/** Single token values per version, on top of the derived ones (prepared pro mode). */
export type FineTokens = Record<ColorMode, Partial<Record<ThemeToken, string>>>;

/** A theme after the check: only known fields, only clean values. */
export type CheckedTheme = {
  name: string;
  author: string | null;
  /** null: the theme is dark only. */
  light: ThemeColors | null;
  dark: ThemeColors;
  /** Stronger lines and quiet texts (like the theme Kontrast). */
  isStrong: boolean;
  fineTokens: FineTokens;
};

/** The colours of the theme Standard; a missing colour in a file is taken from here. */
export const STANDARD_COLORS: Record<ColorMode, ThemeColors> = {
  light: {
    background: "#eef0f4",
    surface: "#ffffff",
    text: "#161a24",
    accent: "#3451d1",
    flowWhen: "#b0620a",
    flowIf: "#0d7569",
    flowThen: "#3451d1",
  },
  dark: {
    background: "#0e1117",
    surface: "#161a22",
    text: "#e6e9f0",
    accent: "#8197ff",
    flowWhen: "#f0a54a",
    flowIf: "#4cc4b3",
    flowThen: "#8197ff",
  },
};

/** Fields of a theme file, in the order they are written. */
export const THEME_FILE_FIELDS = {
  marker: THEME_FILE_MARKER,
  name: "name",
  author: "author",
  light: "light",
  dark: "dark",
  strong: "strong",
  fineTokens: "fineTokens",
} as const;

/** Letters, digits, spaces, "_" and "-" stay in a file name; everything else goes. */
const FILE_NAME_UNSAFE = /[^\p{L}\p{N} _-]/gu;
const FALLBACK_FILE_NAME = "Theme";

/** A theme in the file format, as written to a file, sent to the backend and stored. */
export type ThemeFileValue = {
  [THEME_FILE_MARKER]: number;
  name: string;
  author?: string;
  light?: ThemeColors;
  dark: ThemeColors;
  strong: boolean;
  fineTokens: FineTokens;
};

/** A checked theme in the file format; only fields with a value are written. */
export function themeFileValue(theme: CheckedTheme): ThemeFileValue {
  const file: ThemeFileValue = {
    [THEME_FILE_MARKER]: THEME_FILE_VERSION,
    name: theme.name,
    dark: theme.dark,
    strong: theme.isStrong,
    fineTokens: theme.fineTokens,
  };
  if (theme.author) file.author = theme.author;
  if (theme.light) file.light = theme.light;

  return file;
}

/**
 * The text of a theme file, as "Exportieren" saves it and "Kopieren" copies it.
 *
 * @returns Pretty-printed JSON with the fields in the order of THEME_FILE_FIELDS, readable in a
 *   forum post.
 */
export function themeFileText(theme: CheckedTheme): string {
  const file = themeFileValue(theme);
  const fieldOrder: string[] = Object.values(THEME_FILE_FIELDS);

  return JSON.stringify(file, fieldOrder.concat(nestedFieldNames()), 2);
}

/**
 * Every key below the top level, so the replacer list of JSON.stringify keeps them: the colours
 * of a version, the two versions of the fine-tuned values and the tokens.
 */
function nestedFieldNames(): string[] {
  return [...THEME_COLOR_KEYS, ...COLOR_MODES, ...THEME_TOKENS];
}

/**
 * The file name for a theme.
 *
 * @example themeFileName("Abend/rot!") // "Abendrot.homeace-theme.json"
 */
export function themeFileName(name: string): string {
  const safeName = name.replace(FILE_NAME_UNSAFE, "").trim() || FALLBACK_FILE_NAME;

  return `${safeName}${THEME_FILE_EXTENSION}`;
}
