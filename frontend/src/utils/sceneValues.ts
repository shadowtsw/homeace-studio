/** What a scene sets for one device: HA's state plus attributes, as scenes.yaml keeps them. */
export type SceneValue = Record<string, unknown> & { state?: unknown };

/** What a light can do, from HA's supported_color_modes. */
export type LightCaps = {
  brightness: boolean;
  white: boolean;
  color: boolean;
  minKelvin: number;
  maxKelvin: number;
};

/** The editor's controls of one device; null where the device kind has no such control. */
export type SceneControls = {
  on: boolean | null;
  /** Light brightness in percent, 1–100. */
  brightness: number | null;
  kelvin: number | null;
  /** Hue 0–360 and saturation 0–100. */
  hs: [number, number] | null;
  /** Cover position, 0 (closed) – 100 (open). */
  position: number | null;
  /** Climate: HA's hvac mode, which is the climate's state. */
  hvacMode: string | null;
  temperature: number | null;
};

export const WHITE_PRESETS = { warm: 2700, neutral: 4000, cold: 6000 } as const;
export type WhitePreset = keyof typeof WHITE_PRESETS;

/** Colours offered as swatches, as hue and saturation. */
export const COLOR_PRESETS = {
  red: [0, 85],
  orange: [30, 90],
  green: [130, 75],
  blue: [215, 85],
  purple: [275, 70],
} as const satisfies Record<string, readonly [number, number]>;
export type ColorPreset = keyof typeof COLOR_PRESETS;

const MAX_BRIGHTNESS = 255;
const PERCENT = 100;
const KELVIN_DEFAULT_RANGE = { min: 2000, max: 6500 };
/** A preset counts as chosen when the value is this close to it. */
const KELVIN_TOLERANCE = 150;
const HUE_TOLERANCE = 12;
const SATURATION_TOLERANCE = 15;

const COLOR_MODES_WITH_COLOR = ["hs", "xy", "rgb", "rgbw", "rgbww"];
/** Every attribute of a light that holds its colour; a new colour or white tone replaces them all. */
const LIGHT_COLOR_KEYS = [
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

/** Attributes the editor shows with its own controls, per domain. */
const HANDLED: Record<string, string[]> = {
  light: ["state", "brightness", ...LIGHT_COLOR_KEYS],
  cover: ["state", "current_position"],
  climate: ["state", "temperature"],
};
/**
 * Attributes that describe a device instead of setting it (HA's editor photographs them along).
 * They stay in the scene but are not listed as "Außerdem gespeichert".
 */
const DESCRIPTIVE = new Set([
  "friendly_name",
  "icon",
  "entity_picture",
  "entity_id",
  "id",
  "device_class",
  "unit_of_measurement",
  "state_class",
  "supported_features",
  "supported_color_modes",
  "min_color_temp_kelvin",
  "max_color_temp_kelvin",
  "min_mireds",
  "max_mireds",
  "effect_list",
  "hvac_modes",
  "hvac_action",
  "min_temp",
  "max_temp",
  "target_temp_step",
  "current_temperature",
  "current_humidity",
  "min_humidity",
  "max_humidity",
  "preset_modes",
  "fan_modes",
  "swing_modes",
  "speed_count",
  "percentage_step",
  "source_list",
  "sound_mode_list",
  "assumed_state",
  "attribution",
  "restored",
  "editable",
  "last_reset",
]);
const DESCRIPTIVE_PREFIXES = ["media_", "app_"];

export const domainOf = (entityId: string): string => entityId.split(".")[0] ?? "";

const numberOrNull = (value: unknown): number | null =>
  typeof value === "number" && Number.isFinite(value) ? value : null;

const clamp = (value: number, min: number, max: number): number =>
  Math.min(max, Math.max(min, value));

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

/** Reads the controls of a device from what the scene sets. */
export function readControls(domain: string, value: SceneValue): SceneControls {
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
        : clamp(Math.round((brightness / MAX_BRIGHTNESS) * PERCENT), 1, PERCENT),
    kelvin: usesColor ? null : numberOrNull(value.color_temp_kelvin),
    hs: usesColor && hs ? [hs[0] ?? 0, hs[1] ?? 0] : null,
  };
}

/**
 * Writes changed controls into a device's scene value. Everything else stays; a new white tone or
 * colour replaces all old colour attributes, or the light might take the wrong one.
 */
export function writeControls(
  domain: string,
  value: SceneValue,
  change: Partial<SceneControls>,
): SceneValue {
  const next: SceneValue = { ...value };

  if (change.on !== undefined && change.on !== null) next.state = change.on ? "on" : "off";

  if (domain === "light") {
    if (change.brightness !== undefined && change.brightness !== null) {
      const percent = clamp(change.brightness, 1, PERCENT);
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
    const position = clamp(Math.round(change.position), 0, PERCENT);
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

/** The white tone preset a value is (nearly) at, within the light's range. */
export function whitePresetOf(kelvin: number | null, caps: LightCaps): WhitePreset | null {
  if (kelvin === null) return null;

  return (
    (Object.keys(WHITE_PRESETS) as WhitePreset[]).find(
      (preset) =>
        Math.abs(clamp(WHITE_PRESETS[preset], caps.minKelvin, caps.maxKelvin) - kelvin) <=
        KELVIN_TOLERANCE,
    ) ?? null
  );
}

/** The kelvin a white preset means for this light (its range may be narrower). */
export function presetKelvin(preset: WhitePreset, caps: LightCaps): number {
  return clamp(WHITE_PRESETS[preset], caps.minKelvin, caps.maxKelvin);
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

/**
 * The colour the brightness slider runs up to: the light's colour or white tone. null when the
 * light only dims; the slider then takes the app's accent colour.
 */
export function toneOf(controls: SceneControls, caps: LightCaps): string | null {
  if (controls.hs && caps.color)
    return `hsl(${Math.round(controls.hs[0])} ${Math.round(controls.hs[1])}% 55%)`;
  if (caps.white) return kelvinToCss(controls.kelvin ?? WHITE_PRESETS.neutral);

  return null;
}

/** An approximate CSS colour of a white tone (Tanner Helland's curve fit). */
export function kelvinToCss(kelvin: number): string {
  const temperature = clamp(kelvin, 1000, 40000) / 100;
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
  const channel = (value: number): number => Math.round(clamp(value, 0, 255));

  return `rgb(${channel(red)} ${channel(green)} ${channel(blue)})`;
}

/**
 * Attributes the scene sets that the editor has no control for (an effect, a fan speed …): they
 * stay as they are and are named under "Außerdem gespeichert".
 */
export function extrasOf(domain: string, value: SceneValue): [string, unknown][] {
  const handled = HANDLED[domain] ?? ["state"];

  return Object.entries(value).filter(
    ([key, attribute]) =>
      !handled.includes(key) &&
      !DESCRIPTIVE.has(key) &&
      !DESCRIPTIVE_PREFIXES.some((prefix) => key.startsWith(prefix)) &&
      attribute !== null &&
      attribute !== undefined &&
      !(key === "effect" && attribute === "none"),
  );
}

/** Whether the editor offers on/off for a device kind. */
export function hasOnOff(domain: string): boolean {
  return ON_OFF_DOMAINS.includes(domain);
}
