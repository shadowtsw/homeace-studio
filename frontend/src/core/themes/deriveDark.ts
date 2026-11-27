// Copied from core/themes/deriveDark.ts by scripts/sync-core.mjs. Edit it there and run the script.
import { lightnessOf, withLightness } from "./color";
import type { ThemeColors } from "./themeFormat";

/** Lightness (0–100) of the dark version's page and surfaces, and of its text. */
const DARK_LIGHTNESS = { background: 7, surface: 11, text: 91 };
/** The dark page keeps a little of the light page's hue; text keeps less. */
const DARK_SATURATION = { surfaces: 0.6, text: 0.3, colors: 0.9 };
/** Accent and flow colours are lifted to at least this lightness, so they shine on dark. */
const MIN_LIGHTNESS = { accent: 66, flowWhen: 62, flowIf: 62, flowThen: 66 };

/** The colour at least `minimum` light, a little less saturated. */
function lifted(color: string, minimum: number): string {
  const lightness = Math.max(lightnessOf(color), minimum);

  return withLightness({
    color,
    lightness,
    saturationFactor: DARK_SATURATION.colors,
  });
}

/**
 * A dark version made from a light one: dark page and surfaces in the light page's hue, light
 * text, the accent and the flow colours lifted. Used when a file brings only "light" and for
 * "Dunkel automatisch ableiten" in the editor.
 */
export function deriveDarkColors(light: ThemeColors): ThemeColors {
  return {
    background: withLightness({
      color: light.background,
      lightness: DARK_LIGHTNESS.background,
      saturationFactor: DARK_SATURATION.surfaces,
    }),
    surface: withLightness({
      color: light.background,
      lightness: DARK_LIGHTNESS.surface,
      saturationFactor: DARK_SATURATION.surfaces,
    }),
    text: withLightness({
      color: light.text,
      lightness: DARK_LIGHTNESS.text,
      saturationFactor: DARK_SATURATION.text,
    }),
    accent: lifted(light.accent, MIN_LIGHTNESS.accent),
    flowWhen: lifted(light.flowWhen, MIN_LIGHTNESS.flowWhen),
    flowIf: lifted(light.flowIf, MIN_LIGHTNESS.flowIf),
    flowThen: lifted(light.flowThen, MIN_LIGHTNESS.flowThen),
  };
}
