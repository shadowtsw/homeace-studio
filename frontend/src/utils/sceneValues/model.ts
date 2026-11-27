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

/** "light.kitchen" → "light". */
export const domainOf = (entityId: string): string => entityId.split(".")[0] ?? "";

/** A finite number, else null. */
export const numberOrNull = (value: unknown): number | null =>
  typeof value === "number" && Number.isFinite(value) ? value : null;

/** The value, kept between min and max. */
export const clamp = ({ value, min, max }: { value: number; min: number; max: number }): number =>
  Math.min(max, Math.max(min, value));
