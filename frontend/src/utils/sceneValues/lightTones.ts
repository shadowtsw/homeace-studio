import {
  clamp,
  COLOR_PRESETS,
  WHITE_PRESETS,
  type ColorPreset,
  type LightCaps,
  type SceneControls,
  type WhitePreset,
} from "./model";

/** A preset counts as chosen when the value is this close to it. */
const KELVIN_TOLERANCE = 150;
const HUE_TOLERANCE = 12;
const SATURATION_TOLERANCE = 15;

export type WhitePresetOfOptions = {
  kelvin: number | null;
  caps: LightCaps;
};

/** The white tone preset a value is (nearly) at, within the light's range. */
export function whitePresetOf({ kelvin, caps }: WhitePresetOfOptions): WhitePreset | null {
  if (kelvin === null) return null;

  return (
    (Object.keys(WHITE_PRESETS) as WhitePreset[]).find(
      (preset) =>
        Math.abs(
          clamp({ value: WHITE_PRESETS[preset], min: caps.minKelvin, max: caps.maxKelvin }) -
            kelvin,
        ) <= KELVIN_TOLERANCE,
    ) ?? null
  );
}

export type PresetKelvinOptions = {
  preset: WhitePreset;
  caps: LightCaps;
};

/** The kelvin a white preset means for this light (its range may be narrower). */
export function presetKelvin({ preset, caps }: PresetKelvinOptions): number {
  return clamp({ value: WHITE_PRESETS[preset], min: caps.minKelvin, max: caps.maxKelvin });
}

/** The colour swatch a value is (nearly) at. */
export function colorPresetOf(hs: [number, number] | null): ColorPreset | null {
  if (!hs) return null;
  const hueDistance = (a: number, b: number): number =>
    Math.min(Math.abs(a - b), 360 - Math.abs(a - b));

  return (
    (Object.keys(COLOR_PRESETS) as ColorPreset[]).find(
      (preset) =>
        hueDistance(COLOR_PRESETS[preset][0], hs[0]) <= HUE_TOLERANCE &&
        Math.abs(COLOR_PRESETS[preset][1] - hs[1]) <= SATURATION_TOLERANCE,
    ) ?? null
  );
}

export type ToneOfOptions = {
  controls: SceneControls;
  caps: LightCaps;
};

/**
 * The colour the brightness slider runs up to: the light's colour or white tone. null when the
 * light only dims; the slider then takes the app's accent colour.
 */
export function toneOf({ controls, caps }: ToneOfOptions): string | null {
  if (controls.hs && caps.color)
    return `hsl(${Math.round(controls.hs[0])} ${Math.round(controls.hs[1])}% 55%)`;
  if (caps.white) return kelvinToCss(controls.kelvin ?? WHITE_PRESETS.neutral);

  return null;
}

/** An approximate CSS colour of a white tone (Tanner Helland's curve fit). */
export function kelvinToCss(kelvin: number): string {
  const temperature = clamp({ value: kelvin, min: 1000, max: 40000 }) / 100;
  const red = temperature <= 66 ? 255 : 329.698727446 * (temperature - 60) ** -0.1332047592;
  const green =
    temperature <= 66
      ? 99.4708025861 * Math.log(temperature) - 161.1195681661
      : 288.1221695283 * (temperature - 60) ** -0.0755148492;
  const blue =
    temperature >= 66
      ? 255
      : temperature <= 19
        ? 0
        : 138.5177312231 * Math.log(temperature - 10) - 305.0447927307;
  const channel = (value: number): number => Math.round(clamp({ value, min: 0, max: 255 }));

  return `rgb(${channel(red)} ${channel(green)} ${channel(blue)})`;
}
