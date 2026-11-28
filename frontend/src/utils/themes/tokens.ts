import { contrastRatio, ensureContrast, mixColors, readableOn } from "@/core/themes/color";
import {
  THEME_TOKENS,
  type ColorMode,
  type ThemeColors,
  type ThemeToken,
  type ThemeTokens,
} from "@/core/themes/themeFormat";

/**
 * The hard floor: below this contrast a colour is moved (derived) or dropped (a fine-tuned value),
 * so every theme stays readable, the settings window included. Warnings start higher (editor).
 */
export const MIN_CONTRAST = 2;

/**
 * Pairs of foreground and background that must reach MIN_CONTRAST in the end result: text, the
 * accent, the flow sections, the kinds of entries and the state colours.
 */
const FLOOR_PAIRS: readonly [ThemeToken, ThemeToken][] = [
  ["--fg", "--bg"],
  ["--fg", "--surface"],
  ["--muted", "--surface"],
  ["--accent", "--surface"],
  ["--on-accent", "--accent"],
  ["--flow-when", "--surface"],
  ["--flow-if", "--surface"],
  ["--flow-then", "--surface"],
  ["--on-flow-when", "--flow-when"],
  ["--on-flow-if", "--flow-if"],
  ["--on-flow-then", "--flow-then"],
  ["--kind-automation", "--surface"],
  ["--kind-script", "--surface"],
  ["--kind-scene", "--surface"],
  ["--kind-helper", "--surface"],
  ["--ok", "--surface"],
  ["--warn", "--surface"],
  ["--err", "--surface"],
];

/**
 * Colours every derived theme takes from Standard: script and scene keep their family (purple,
 * pink), the states theirs; their soft versions are mixed onto the theme's own surface.
 */
const SHARED_COLORS: Record<
  ColorMode,
  Record<"script" | "scene" | "ok" | "warn" | "err" | "scrim" | "shadow", string>
> = {
  light: {
    script: "#6b43c2",
    scene: "#b23a73",
    ok: "#1b7f48",
    warn: "#9f6510",
    err: "#bc3434",
    scrim: "rgba(14, 18, 28, 0.38)",
    shadow: "0 1px 2px rgba(18, 24, 40, 0.06), 0 12px 32px rgba(18, 24, 40, 0.12)",
  },
  dark: {
    script: "#b595f6",
    scene: "#f28dbd",
    ok: "#4fcf88",
    warn: "#e5b04e",
    err: "#f07777",
    scrim: "rgba(0, 0, 0, 0.55)",
    shadow: "0 1px 2px rgba(0, 0, 0, 0.4), 0 14px 36px rgba(0, 0, 0, 0.5)",
  },
};

/** Text on accent buttons: the darkest background of Standard, or white. */
const ON_ACCENT_CHOICES = { dark: "#0e1117", light: "#ffffff" };

/** How much of a colour its soft version keeps, mixed onto the surface. */
const SOFT_SHARE: Record<ColorMode, number> = { light: 0.14, dark: 0.2 };
const ACCENT_SOFT_SHARE: Record<ColorMode, number> = { light: 0.12, dark: 0.22 };
const STATE_SOFT_SHARE = 0.16;

/** Shares of the text colour in the quiet colours; "strong" themes (Kontrast) use more. */
const TEXT_SHARES = {
  normal: { line: 0.12, lineStrong: 0.24, muted: 0.68, faint: 0.48 },
  strong: { line: 0.45, lineStrong: 0.7, muted: 0.88, faint: 0.75 },
};
const SUNKEN_TEXT_SHARE: Record<ColorMode, number> = { light: 0.06, dark: 0.05 };

export type DeriveTokensOptions = {
  colors: ThemeColors;
  mode: ColorMode;
  /** Stronger lines and quiet texts (the Kontrast theme). */
  isStrong: boolean;
};

type ReadableColors = Omit<ThemeColors, "background" | "surface"> &
  Record<"script" | "scene" | "ok" | "warn" | "err", string>;

/** The theme's colours and the shared ones, each moved where it would fall below MIN_CONTRAST. */
function readableColors({ colors, mode }: Omit<DeriveTokensOptions, "isStrong">): ReadableColors {
  const shared = SHARED_COLORS[mode];
  const onSurface = (color: string): string =>
    ensureContrast({ color, background: colors.surface, minRatio: MIN_CONTRAST });
  // Text stands on both, the page background and the surfaces
  const textOnBackground = ensureContrast({
    color: colors.text,
    background: colors.background,
    minRatio: MIN_CONTRAST,
  });

  return {
    text: onSurface(textOnBackground),
    accent: onSurface(colors.accent),
    flowWhen: onSurface(colors.flowWhen),
    flowIf: onSurface(colors.flowIf),
    flowThen: onSurface(colors.flowThen),
    script: onSurface(shared.script),
    scene: onSurface(shared.scene),
    ok: onSurface(shared.ok),
    warn: onSurface(shared.warn),
    err: onSurface(shared.err),
  };
}

/**
 * All tokens of a theme version from its colours: first every colour is made readable on the
 * theme's surfaces, then lines, quiet texts and soft backgrounds are mixed from them.
 */
export function deriveTokens({ colors, mode, isStrong }: DeriveTokensOptions): ThemeTokens {
  const { background, surface } = colors;
  const readable = readableColors({ colors, mode });
  const shares = isStrong ? TEXT_SHARES.strong : TEXT_SHARES.normal;
  const fromText = (weight: number): string =>
    mixColors({ color: readable.text, other: surface, weight });
  const soft = (color: string, weight = SOFT_SHARE[mode]): string =>
    mixColors({ color, other: surface, weight });
  const muted = ensureContrast({
    color: fromText(shares.muted),
    background: surface,
    minRatio: MIN_CONTRAST,
  });

  return {
    "--bg": background,
    "--surface": surface,
    "--surface-2": mixColors({ color: surface, other: background, weight: 0.5 }),
    "--sunken": mixColors({
      color: readable.text,
      other: background,
      weight: SUNKEN_TEXT_SHARE[mode],
    }),
    "--line": fromText(shares.line),
    "--line-strong": fromText(shares.lineStrong),
    "--fg": readable.text,
    "--muted": muted,
    "--faint": fromText(shares.faint),
    "--accent": readable.accent,
    "--accent-soft": soft(readable.accent, ACCENT_SOFT_SHARE[mode]),
    "--on-accent": readableOn([readable.accent], ON_ACCENT_CHOICES),
    "--flow-when": readable.flowWhen,
    "--flow-when-soft": soft(readable.flowWhen),
    "--flow-if": readable.flowIf,
    "--flow-if-soft": soft(readable.flowIf),
    "--flow-then": readable.flowThen,
    "--flow-then-soft": soft(readable.flowThen),
    // Text on the filled flow labels, each on its own colour
    "--on-flow-when": readableOn([readable.flowWhen], ON_ACCENT_CHOICES),
    "--on-flow-if": readableOn([readable.flowIf], ON_ACCENT_CHOICES),
    "--on-flow-then": readableOn([readable.flowThen], ON_ACCENT_CHOICES),
    "--kind-automation": readable.flowWhen,
    "--kind-automation-soft": soft(readable.flowWhen),
    "--kind-script": readable.script,
    "--kind-script-soft": soft(readable.script),
    "--kind-scene": readable.scene,
    "--kind-scene-soft": soft(readable.scene),
    "--kind-helper": readable.flowIf,
    "--kind-helper-soft": soft(readable.flowIf),
    "--ok": readable.ok,
    "--ok-soft": soft(readable.ok, STATE_SOFT_SHARE),
    "--warn": readable.warn,
    "--warn-soft": soft(readable.warn, STATE_SOFT_SHARE),
    "--err": readable.err,
    "--err-soft": soft(readable.err, STATE_SOFT_SHARE),
    "--scrim": SHARED_COLORS[mode].scrim,
    "--shadow": SHARED_COLORS[mode].shadow,
  };
}

/** The pairs of a token set that fall below MIN_CONTRAST, as "foreground on background". */
export function pairsBelowFloor(tokens: ThemeTokens): string[] {
  const failing = FLOOR_PAIRS.filter(
    ([foreground, background]) =>
      contrastRatio(tokens[foreground], tokens[background]) < MIN_CONTRAST,
  );

  return failing.map(([foreground, background]) => `${foreground} on ${background}`);
}

/**
 * Fine-tuned single values on top of derived tokens (the prepared pro mode). A value that would
 * push any pair below MIN_CONTRAST is dropped, one value at a time.
 *
 * @param fineTokens - Only colour tokens with checked `#rrggbb` values (the import checks them).
 * @returns The tokens in the end, and which fine values were dropped (for the check report).
 */
export function withFineTokens({
  tokens,
  fineTokens,
}: {
  tokens: ThemeTokens;
  fineTokens: Partial<ThemeTokens>;
}): { tokens: ThemeTokens; droppedTokens: ThemeToken[] } {
  const result: ThemeTokens = { ...tokens };
  const droppedTokens: ThemeToken[] = [];

  for (const token of THEME_TOKENS) {
    const fineValue = fineTokens[token];
    if (fineValue === undefined) continue;

    // Kept unless it adds a pair below the floor
    const before = result[token];
    const failingBefore = pairsBelowFloor(result).length;
    result[token] = fineValue;
    if (pairsBelowFloor(result).length <= failingBefore) continue;

    result[token] = before;
    droppedTokens.push(token);
  }

  return { tokens: result, droppedTokens };
}
