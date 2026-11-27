import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import {
  BUILT_IN_THEMES,
  STANDARD_THEME,
  STANDARD_TOKENS,
  modeOfTheme,
  themeTokens,
  type ThemeDefinition,
} from "@/utils/themes/builtInThemes";
import { contrastRatio, isHexColor } from "@/core/themes/color";
import { COLOR_MODE, THEME_TOKENS, type ColorMode } from "@/core/themes/themeFormat";
import { pairsBelowFloor } from "@/utils/themes/tokens";

const TOKENS_CSS = readFileSync(join(__dirname, "..", "..", "..", "styles", "tokens.css"), "utf8");
const DARK_BLOCK_START = "@media (prefers-color-scheme: dark)";
/** Good reading contrast for text (WCAG AA); the floor itself is lower. */
const TEXT_CONTRAST = 4.5;
/** Tokens that are no single colour. */
const NOT_A_COLOR = new Set(["--scrim", "--shadow"]);

function cssValues(block: string): Record<string, string> {
  const declarations = [...block.matchAll(/(--[a-z0-9-]+):\s*([^;]+);/g)];
  return Object.fromEntries(declarations.map((match) => [match[1], match[2]?.trim()]));
}

/** Every version a theme has, as [theme, mode]. */
function versions(): [ThemeDefinition, ColorMode][] {
  return BUILT_IN_THEMES.flatMap((theme) => {
    const modes = [COLOR_MODE.light, COLOR_MODE.dark].filter((mode) => theme[mode]);
    return modes.map((mode): [ThemeDefinition, ColorMode] => [theme, mode]);
  });
}

describe("theme Standard", () => {
  it("has the values of styles/tokens.css, so the first paint and the app agree", () => {
    const [lightBlock = "", darkBlock = ""] = TOKENS_CSS.split(DARK_BLOCK_START);
    const lightCss = cssValues(lightBlock);
    const darkCss = cssValues(darkBlock);

    for (const token of THEME_TOKENS) {
      expect(lightCss[token], `light ${token}`).toBe(STANDARD_TOKENS.light[token]);
      expect(darkCss[token], `dark ${token}`).toBe(STANDARD_TOKENS.dark[token]);
    }
  });

  it("is returned value for value, not derived", () => {
    expect(themeTokens({ theme: STANDARD_THEME, mode: "dark" }).tokens).toBe(STANDARD_TOKENS.dark);
  });
});

describe("ready-made themes", () => {
  it.each(versions().map(([theme, mode]) => [theme.id, mode, theme] as const))(
    "%s (%s): every pair above the floor, text well readable",
    (_id, mode, theme) => {
      const { tokens, droppedTokens } = themeTokens({ theme, mode });

      expect(pairsBelowFloor(tokens)).toEqual([]);
      expect(droppedTokens).toEqual([]);
      expect(contrastRatio(tokens["--fg"], tokens["--bg"])).toBeGreaterThanOrEqual(TEXT_CONTRAST);
      expect(contrastRatio(tokens["--fg"], tokens["--surface"])).toBeGreaterThanOrEqual(
        TEXT_CONTRAST,
      );
    },
  );

  it("set every token, colours only as #rrggbb", () => {
    for (const [theme, mode] of versions()) {
      const { tokens } = themeTokens({ theme, mode });
      const badColors = THEME_TOKENS.filter(
        (token) => !NOT_A_COLOR.has(token) && !isHexColor(tokens[token]),
      );

      expect(badColors, `${theme.id} ${mode}`).toEqual([]);
    }
  });

  it("keep Wenn, Und nur wenn and Dann apart from the accent (Wald: green accent, blue Dann)", () => {
    const forest = BUILT_IN_THEMES.find((theme) => theme.id === "forest");
    if (!forest) throw new Error("theme forest is missing");
    const { tokens } = themeTokens({ theme: forest, mode: "light" });

    expect(tokens["--flow-then"]).not.toBe(tokens["--accent"]);
    expect(tokens["--kind-automation"]).toBe(tokens["--flow-when"]);
    expect(tokens["--kind-helper"]).toBe(tokens["--flow-if"]);
  });

  it("show the version they have: Mitternacht is dark only", () => {
    const midnight = BUILT_IN_THEMES.find((theme) => theme.id === "midnight");
    if (!midnight) throw new Error("theme midnight is missing");

    expect(modeOfTheme({ theme: midnight, wanted: "light" })).toBe("dark");
    expect(modeOfTheme({ theme: STANDARD_THEME, wanted: "light" })).toBe("light");
  });
});

describe("fine-tuned values", () => {
  const fjord = BUILT_IN_THEMES.find((theme) => theme.id === "fjord");

  it("are laid on top where they keep the floor", () => {
    if (!fjord) throw new Error("theme fjord is missing");
    const tuned = { ...fjord, fineTokens: { dark: { "--line": "#334455" } } };

    expect(themeTokens({ theme: tuned, mode: "dark" }).tokens["--line"]).toBe("#334455");
  });

  it("are dropped where they would make text unreadable (found in the dummy: --bg white in dark)", () => {
    if (!fjord) throw new Error("theme fjord is missing");
    const tuned = { ...fjord, fineTokens: { dark: { "--bg": "#ffffff" } } };
    const { tokens, droppedTokens } = themeTokens({ theme: tuned, mode: "dark" });

    expect(droppedTokens).toEqual(["--bg"]);
    expect(tokens["--bg"]).not.toBe("#ffffff");
    expect(pairsBelowFloor(tokens)).toEqual([]);
  });

  it("count per version: a dark value leaves the light version alone", () => {
    if (!fjord) throw new Error("theme fjord is missing");
    const tuned = { ...fjord, fineTokens: { dark: { "--line": "#334455" } } };

    expect(themeTokens({ theme: tuned, mode: "light" }).tokens["--line"]).not.toBe("#334455");
  });
});
