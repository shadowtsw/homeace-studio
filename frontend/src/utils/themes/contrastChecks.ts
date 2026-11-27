import { contrastRatio, ensureContrast } from "@/core/themes/color";
import type { ThemeColorKey, ThemeColors } from "@/core/themes/themeFormat";

import { MIN_CONTRAST } from "./tokens";

/** Good reading contrast (WCAG AA): text 4.5 : 1, larger marks like the accent 3 : 1. */
export const GOOD_CONTRAST = { text: 4.5, accent: 3 } as const;

export const CONTRAST_LEVEL = {
  /** Reads well. */
  good: "good",
  /** Readable, but below the good value. */
  weak: "weak",
  /** Below the floor: shown adjusted. */
  unreadable: "unreadable",
} as const;
export type ContrastLevel = (typeof CONTRAST_LEVEL)[keyof typeof CONTRAST_LEVEL];

/** One pair the editor checks: a colour on a background. */
export type ContrastCheck = {
  id: "textOnBackground" | "textOnSurface" | "accentOnSurface";
  foreground: ThemeColorKey;
  background: ThemeColorKey;
  ratio: number;
  goodRatio: number;
  level: ContrastLevel;
};

const CHECKED_PAIRS = [
  {
    id: "textOnBackground",
    foreground: "text",
    background: "background",
    goodRatio: GOOD_CONTRAST.text,
  },
  { id: "textOnSurface", foreground: "text", background: "surface", goodRatio: GOOD_CONTRAST.text },
  {
    id: "accentOnSurface",
    foreground: "accent",
    background: "surface",
    goodRatio: GOOD_CONTRAST.accent,
  },
] as const;

function levelOf({ ratio, goodRatio }: { ratio: number; goodRatio: number }): ContrastLevel {
  if (ratio < MIN_CONTRAST) return CONTRAST_LEVEL.unreadable;
  if (ratio < goodRatio) return CONTRAST_LEVEL.weak;

  return CONTRAST_LEVEL.good;
}

/**
 * The contrast warnings of the editor for one version: text on the page and on surfaces, the accent
 * on surfaces.
 */
export function contrastChecks(colors: ThemeColors): ContrastCheck[] {
  return CHECKED_PAIRS.map((pair) => {
    const ratio = contrastRatio(colors[pair.foreground], colors[pair.background]);
    return { ...pair, ratio, level: levelOf({ ratio, goodRatio: pair.goodRatio }) };
  });
}

/**
 * "Vorschlag übernehmen": the colours with the check's foreground moved until it reads well. For
 * text both backgrounds count, so fixing one never breaks the other.
 */
export function withSuggestion({
  colors,
  check,
}: {
  colors: ThemeColors;
  check: ContrastCheck;
}): ThemeColors {
  let color = ensureContrast({
    color: colors[check.foreground],
    background: colors[check.background],
    minRatio: check.goodRatio,
  });
  if (check.foreground === "text") {
    const otherBackground = check.background === "surface" ? colors.background : colors.surface;
    color = ensureContrast({ color, background: otherBackground, minRatio: check.goodRatio });
  }

  return { ...colors, [check.foreground]: color };
}
