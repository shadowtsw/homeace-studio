import { checkThemeValue, cleanText } from "@/core/themes/checkTheme";
import { luminance, mixColors } from "@/core/themes/color";
import {
  COLOR_MODE,
  MAX_THEME_NAME_LENGTH,
  STANDARD_COLORS,
  THEME_FILE_MARKER,
  THEME_FILE_VERSION,
  type ColorMode,
  type ThemeColors,
} from "@/core/themes/themeFormat";
import { isRecord } from "@/utils/record";

import type { ThemeDefinition } from "./builtInThemes";

/**
 * "Wie mein HA": the colours HA shows right now, read from HA's page around the panel. They are
 * foreign data: every value goes through the browser's colour parser into numbers, then through the
 * same check as an imported theme. A raw value from HA never reaches HomeAce's styles.
 */

export const HA_THEME_ID = "homeAssistant";

/** A colour as numbers; alpha 0–1. */
export type Rgba = { red: number; green: number; blue: number; alpha: number };
/** Turns any CSS colour into numbers, or null when it is no colour. */
export type CssColorParser = (value: string) => Rgba | null;

/** The part of HA's page the reader uses, so tests can hand in their own. */
export type HaPage = {
  getComputedStyle(element: Element): { getPropertyValue(name: string): string };
  document: { documentElement: Element; querySelector(selectors: string): Element | null };
};

/** HA's CSS variables, the first one that is set counts. */
const HA_VARIABLES = {
  accent: ["--primary-color"],
  background: ["--primary-background-color"],
  surface: ["--card-background-color", "--ha-card-background", "--secondary-background-color"],
  text: ["--primary-text-color"],
} as const;
/** HA's own theme; it has no name worth showing. */
const HA_DEFAULT_THEME_NAME = "default";
/** Below this luminance HA's page counts as dark. */
const DARK_BACKGROUND_LUMINANCE = 0.18;
const CHANNEL_MAX = 255;
/** A colour the canvas keeps when it is given no colour at all. */
const PARSER_SENTINEL = "#010203";
const HEX_COLOR = /^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i;
const RGBA_COLOR = /^rgba?\(\s*(\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\s*\)$/i;

function toHex({ red, green, blue }: Rgba): string {
  const channels = [red, green, blue].map((channel) => {
    const clamped = Math.round(Math.min(Math.max(channel, 0), CHANNEL_MAX));
    return clamped.toString(16).padStart(2, "0");
  });
  return `#${channels.join("")}`;
}

/** What a canvas gives back for a colour: `#rrggbb`, or `rgba(r, g, b, a)` when see-through. */
export function rgbaFromCanvasColor(normalized: string): Rgba | null {
  const hex = HEX_COLOR.exec(normalized);
  if (hex) {
    const [, red = "0", green = "0", blue = "0"] = hex;
    return {
      red: parseInt(red, 16),
      green: parseInt(green, 16),
      blue: parseInt(blue, 16),
      alpha: 1,
    };
  }

  const rgba = RGBA_COLOR.exec(normalized);
  if (!rgba) return null;
  const [, red = "0", green = "0", blue = "0", alpha = "1"] = rgba;
  return { red: Number(red), green: Number(green), blue: Number(blue), alpha: Number(alpha) };
}

/**
 * The browser's own colour parser: a canvas understands every CSS colour form (names, `rgb()`,
 * `hsl()` …) and gives back plain numbers. Never used to paint; the value only goes in as text.
 */
export function browserColorParser(): CssColorParser {
  const context = document.createElement("canvas").getContext("2d");

  return (value) => {
    if (!context) return null;
    context.fillStyle = PARSER_SENTINEL;
    context.fillStyle = value.trim();
    const normalized = String(context.fillStyle);
    // The canvas ignores what is no colour and keeps the sentinel
    const isSentinel =
      normalized === PARSER_SENTINEL && value.trim().toLowerCase() !== PARSER_SENTINEL;
    if (isSentinel) return null;

    return rgbaFromCanvasColor(normalized);
  };
}

function readVariable({ page, names }: { page: HaPage; names: readonly string[] }): string {
  const style = page.getComputedStyle(page.document.documentElement);
  const values = names.map((name) => style.getPropertyValue(name).trim());
  return values.find((value) => value !== "") ?? "";
}

/** A colour from HA as `#rrggbb`; a see-through one is mixed onto the background first. */
function colorOf({
  page,
  names,
  parse,
  background,
}: {
  page: HaPage;
  names: readonly string[];
  parse: CssColorParser;
  background: string | null;
}): string | null {
  const rgba = parse(readVariable({ page, names }));
  if (!rgba) return null;

  const opaque = toHex(rgba);
  if (rgba.alpha >= 1 || !background) return opaque;
  return mixColors({ color: opaque, other: background, weight: rgba.alpha });
}

/** The name of the HA theme in use, if HA's page tells it (`hass.themes.theme`); not HA's own. */
function themeNameOf(page: HaPage): string | null {
  const element: unknown = page.document.querySelector("home-assistant");
  const hass = isRecord(element) ? element.hass : null;
  const themes = isRecord(hass) ? hass.themes : null;
  const name = isRecord(themes) ? themes.theme : null;
  if (typeof name !== "string" || name === HA_DEFAULT_THEME_NAME) return null;

  return cleanText({ text: name, maxLength: MAX_THEME_NAME_LENGTH }) || null;
}

/**
 * The HA theme as a HomeAce theme with the one version HA shows now; brightness follows HA.
 *
 * @param page - HA's page around the panel; null outside the panel (own port, demo).
 * @returns null when HomeAce is not in the panel or HA's colours cannot be read.
 */
export function readHaTheme({
  page,
  parse,
}: {
  page: HaPage | null;
  parse: CssColorParser;
}): ThemeDefinition | null {
  if (!page) return null;

  // HA's colours, background first (see-through colours are mixed onto it)
  const background = colorOf({ page, names: HA_VARIABLES.background, parse, background: null });
  if (!background) return null;
  const read = (names: readonly string[]): string | null =>
    colorOf({ page, names, parse, background });
  const accent = read(HA_VARIABLES.accent);
  const text = read(HA_VARIABLES.text);
  if (!accent || !text) return null;
  const surface = read(HA_VARIABLES.surface) ?? background;

  // The version HA shows; the flow colours keep their families for it
  const mode: ColorMode =
    luminance(background) < DARK_BACKGROUND_LUMINANCE ? COLOR_MODE.dark : COLOR_MODE.light;
  const { flowWhen, flowIf, flowThen } = STANDARD_COLORS[mode];
  const colors: ThemeColors = { background, surface, text, accent, flowWhen, flowIf, flowThen };

  // The same check as an imported theme
  const haThemeName = themeNameOf(page);
  const file = {
    [THEME_FILE_MARKER]: THEME_FILE_VERSION,
    name: haThemeName ?? HA_THEME_ID,
    [mode]: colors,
  };
  const result = checkThemeValue(file);
  if (!result.isValid) return null;
  const checked = mode === COLOR_MODE.dark ? result.theme.dark : result.theme.light;

  return {
    id: HA_THEME_ID,
    light: mode === COLOR_MODE.light ? checked : null,
    dark: mode === COLOR_MODE.dark ? checked : null,
    isStrong: false,
    followsHa: true,
    haThemeName,
  };
}
