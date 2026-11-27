import { LIGHT_COLOR_KEYS } from "./controls";
import type { SceneValue } from "./model";

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

export type ExtrasOfOptions = {
  domain: string;
  value: SceneValue;
};

/**
 * Attributes the scene sets that the editor has no control for (an effect, a fan speed …): they
 * stay as they are and are named under "Außerdem gespeichert".
 */
export function extrasOf({ domain, value }: ExtrasOfOptions): [string, unknown][] {
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
