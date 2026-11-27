// Copied from core/themes/color.ts by scripts/sync-core.mjs. Edit it there and run the script.
/**
 * Colour arithmetic for the themes: only plain `#rrggbb` values, which is also the one form a theme
 * may contain (nothing like `url(…)` can reach a style that way).
 */

type Rgb = [number, number, number];
type Hsl = { hue: number; saturation: number; lightness: number };

const HEX_COLOR = /^#[0-9a-f]{6}$/i;
const CHANNEL_MAX = 255;
/** WCAG 2 relative luminance: weights of red, green and blue as the eye sees them. */
const LUMINANCE_WEIGHTS = { red: 0.2126, green: 0.7152, blue: 0.0722 };
/** Below this luminance a background counts as dark, so text must get lighter to stand out. */
const DARK_BACKGROUND_LUMINANCE = 0.18;
const BLACK = "#000000";
const WHITE = "#ffffff";

export function isHexColor(value: unknown): value is string {
  return typeof value === "string" && HEX_COLOR.test(value);
}

function toRgb(color: string): Rgb {
  const red = Number.parseInt(color.slice(1, 3), 16);
  const green = Number.parseInt(color.slice(3, 5), 16);
  const blue = Number.parseInt(color.slice(5, 7), 16);

  return [red, green, blue];
}

function toHex(rgb: Rgb): string {
  const channels = rgb.map((channel) => {
    const clamped = Math.round(Math.min(Math.max(channel, 0), CHANNEL_MAX));
    return clamped.toString(16).padStart(2, "0");
  });

  return `#${channels.join("")}`;
}

/**
 * A colour between two others.
 *
 * @param color - Gets the share `weight`.
 * @param other - Gets the rest.
 * @param weight - 0 to 1.
 * @example mixColors({ color: "#000000", other: "#ffffff", weight: 0.25 }) // "#bfbfbf"
 */
export function mixColors({
  color,
  other,
  weight,
}: {
  color: string;
  other: string;
  weight: number;
}): string {
  const [red, green, blue] = toRgb(color);
  const [otherRed, otherGreen, otherBlue] = toRgb(other);
  const blend = (channel: number, otherChannel: number): number =>
    channel * weight + otherChannel * (1 - weight);

  return toHex([blend(red, otherRed), blend(green, otherGreen), blend(blue, otherBlue)]);
}

/** A channel as light energy: the sRGB curve undone (WCAG 2 formula). */
function linearChannel(channel: number): number {
  const share = channel / CHANNEL_MAX;
  return share <= 0.03928 ? share / 12.92 : ((share + 0.055) / 1.055) ** 2.4;
}

/** WCAG 2 relative luminance, 0 (black) to 1 (white). */
export function luminance(color: string): number {
  const [red, green, blue] = toRgb(color);

  return (
    LUMINANCE_WEIGHTS.red * linearChannel(red) +
    LUMINANCE_WEIGHTS.green * linearChannel(green) +
    LUMINANCE_WEIGHTS.blue * linearChannel(blue)
  );
}

/**
 * WCAG 2 contrast ratio of two colours, 1 (same) to 21 (black on white).
 *
 * @example contrastRatio("#000000", "#ffffff") // 21
 */
export function contrastRatio(color: string, other: string): number {
  const lighter = Math.max(luminance(color), luminance(other));
  const darker = Math.min(luminance(color), luminance(other));

  return (lighter + 0.05) / (darker + 0.05);
}

function toHsl(color: string): Hsl {
  const [redChannel, greenChannel, blueChannel] = toRgb(color);
  const red = redChannel / CHANNEL_MAX;
  const green = greenChannel / CHANNEL_MAX;
  const blue = blueChannel / CHANNEL_MAX;
  const max = Math.max(red, green, blue);
  const min = Math.min(red, green, blue);
  const lightness = (max + min) / 2;
  if (max === min) return { hue: 0, saturation: 0, lightness: lightness * 100 };

  const range = max - min;
  const saturation = lightness > 0.5 ? range / (2 - max - min) : range / (max + min);
  const hue = hueOf({ red, green, blue, max, range });

  return { hue, saturation: saturation * 100, lightness: lightness * 100 };
}

/** The hue in degrees, from whichever channel is the strongest. */
function hueOf({
  red,
  green,
  blue,
  max,
  range,
}: {
  red: number;
  green: number;
  blue: number;
  max: number;
  range: number;
}): number {
  if (max === red) return (((green - blue) / range + (green < blue ? 6 : 0)) * 60) % 360;
  if (max === green) return ((blue - red) / range + 2) * 60;

  return ((red - green) / range + 4) * 60;
}

function fromHsl({ hue, saturation, lightness }: Hsl): string {
  const share = saturation / 100;
  const light = lightness / 100;
  const amount = share * Math.min(light, 1 - light);
  // The standard HSL → RGB formula: each channel n is read 0, 8 and 4 twelfths around the hue wheel
  const channel = (offset: number): number => {
    const position = (offset + hue / 30) % 12;
    const level = Math.max(-1, Math.min(position - 3, 9 - position, 1));
    return (light - amount * level) * CHANNEL_MAX;
  };

  return toHex([channel(0), channel(8), channel(4)]);
}

/**
 * The same colour with another lightness (0–100), saturation scaled by `saturationFactor`.
 *
 * @example withLightness({ color: "#3451d1", lightness: 70 }) // a light blue
 */
export function withLightness({
  color,
  lightness,
  saturationFactor = 1,
}: {
  color: string;
  lightness: number;
  saturationFactor?: number;
}): string {
  const { hue, saturation } = toHsl(color);

  return fromHsl({ hue, saturation: saturation * saturationFactor, lightness });
}

export function lightnessOf(color: string): number {
  return toHsl(color).lightness;
}

/**
 * Makes a colour stand out from a background by at least `minRatio`: it keeps its hue and
 * saturation and only moves its lightness away from the background, one step at a time.
 *
 * @returns The colour itself when it already stands out; black or white when no lightness of its
 *   hue gets there.
 */
export function ensureContrast({
  color,
  background,
  minRatio,
}: {
  color: string;
  background: string;
  minRatio: number;
}): string {
  if (contrastRatio(color, background) >= minRatio) return color;

  const isDarkBackground = luminance(background) < DARK_BACKGROUND_LUMINANCE;
  const step = isDarkBackground ? 1 : -1;
  for (let lightness = lightnessOf(color); lightness >= 0 && lightness <= 100; lightness += step) {
    const candidate = withLightness({ color, lightness });
    if (contrastRatio(candidate, background) >= minRatio) return candidate;
  }

  return isDarkBackground ? WHITE : BLACK;
}

/** Black-ish or white, whichever reads better on all the given colours (text on buttons). */
export function readableOn(
  colors: string[],
  { dark, light }: { dark: string; light: string },
): string {
  const worstOnDark = Math.min(...colors.map((color) => contrastRatio(color, dark)));
  const worstOnLight = Math.min(...colors.map((color) => contrastRatio(color, light)));

  return worstOnDark >= worstOnLight ? dark : light;
}
