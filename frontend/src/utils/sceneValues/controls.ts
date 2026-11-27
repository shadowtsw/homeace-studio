import { clamp, numberOrNull, type LightCaps, type SceneControls, type SceneValue } from "./model";

const MAX_BRIGHTNESS = 255;
const PERCENT = 100;
const KELVIN_DEFAULT_RANGE = { min: 2000, max: 6500 };

const COLOR_MODES_WITH_COLOR = ["hs", "xy", "rgb", "rgbw", "rgbww"];
/**
 * Every attribute of a light that holds its colour; a new colour or white tone replaces them all.
 */
export const LIGHT_COLOR_KEYS = [
  "color_mode",
  "color_temp_kelvin",
  "color_temp",
  "hs_color",
  "rgb_color",
  "xy_color",
  "rgbw_color",
  "rgbww_color",
];
/** Domains whose devices the editor switches on and off. */
const ON_OFF_DOMAINS = [
  "light",
  "switch",
  "fan",
  "media_player",
  "input_boolean",
  "siren",
  "humidifier",
  "remote",
];

/** What a light can do, from its current attributes. */
export function lightCaps(attributes: Record<string, unknown> | undefined): LightCaps {
  const modes = Array.isArray(attributes?.supported_color_modes)
    ? (attributes.supported_color_modes as unknown[]).map(String)
    : [];
  const white = modes.includes("color_temp");
  const color = modes.some((mode) => COLOR_MODES_WITH_COLOR.includes(mode));

  return {
    brightness: modes.some((mode) => mode !== "onoff"),
    white,
    color,
    minKelvin: numberOrNull(attributes?.min_color_temp_kelvin) ?? KELVIN_DEFAULT_RANGE.min,
    maxKelvin: numberOrNull(attributes?.max_color_temp_kelvin) ?? KELVIN_DEFAULT_RANGE.max,
  };
}

export type ReadControlsOptions = {
  domain: string;
  value: SceneValue;
};

/** Reads the controls of a device from what the scene sets. */
export function readControls({ domain, value }: ReadControlsOptions): SceneControls {
  const state = typeof value.state === "string" ? value.state : "";
  const controls: SceneControls = {
    on: null,
    brightness: null,
    kelvin: null,
    hs: null,
    position: null,
    hvacMode: null,
    temperature: null,
  };

  if (domain === "cover") {
    const position = numberOrNull(value.current_position);
    return { ...controls, position: position ?? (state === "closed" ? 0 : PERCENT) };
  }

  if (domain === "climate") {
    return { ...controls, hvacMode: state || null, temperature: numberOrNull(value.temperature) };
  }

  if (!ON_OFF_DOMAINS.includes(domain)) return controls;

  controls.on = state === "on";
  if (domain !== "light") return controls;

  const brightness = numberOrNull(value.brightness);
  const hs = Array.isArray(value.hs_color) ? (value.hs_color as unknown[]).map(Number) : null;
  const usesColor = value.color_mode !== "color_temp" && hs?.length === 2;

  return {
    ...controls,
    brightness:
      brightness === null
        ? PERCENT
        : clamp({
            value: Math.round((brightness / MAX_BRIGHTNESS) * PERCENT),
            min: 1,
            max: PERCENT,
          }),
    kelvin: usesColor ? null : numberOrNull(value.color_temp_kelvin),
    hs: usesColor && hs ? [hs[0] ?? 0, hs[1] ?? 0] : null,
  };
}

export type WriteControlsOptions = {
  domain: string;
  value: SceneValue;
  change: Partial<SceneControls>;
};

/**
 * Writes changed controls into a device's scene value. Everything else stays; a new white tone or
 * colour replaces all old colour attributes, or the light might take the wrong one.
 */
export function writeControls({ domain, value, change }: WriteControlsOptions): SceneValue {
  const next: SceneValue = { ...value };

  if (change.on !== undefined && change.on !== null) next.state = change.on ? "on" : "off";

  if (domain === "light") {
    if (change.brightness !== undefined && change.brightness !== null) {
      const percent = clamp({ value: change.brightness, min: 1, max: PERCENT });
      next.brightness = Math.round((percent / PERCENT) * MAX_BRIGHTNESS);
    }
    if (change.kelvin) {
      for (const key of LIGHT_COLOR_KEYS) delete next[key];
      next.color_mode = "color_temp";
      next.color_temp_kelvin = Math.round(change.kelvin);
    }
    if (change.hs) {
      for (const key of LIGHT_COLOR_KEYS) delete next[key];
      next.color_mode = "hs";
      next.hs_color = [change.hs[0], change.hs[1]];
    }
  }

  if (domain === "cover" && change.position !== undefined && change.position !== null) {
    const position = clamp({ value: Math.round(change.position), min: 0, max: PERCENT });
    next.current_position = position;
    next.state = position > 0 ? "open" : "closed";
  }

  if (domain === "climate") {
    if (change.hvacMode) next.state = change.hvacMode;
    if (change.temperature !== undefined && change.temperature !== null) {
      next.temperature = change.temperature;
    }
  }

  return next;
}

/** Whether the editor offers on/off for a device kind. */
export function hasOnOff(domain: string): boolean {
  return ON_OFF_DOMAINS.includes(domain);
}
