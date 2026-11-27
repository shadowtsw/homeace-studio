/**
 * What a scene sets for a device, and how the scene editor reads and writes it: on/off, brightness,
 * white tone and colour of lights, cover position, thermostat mode and temperature.
 */
export {
  COLOR_PRESETS,
  WHITE_PRESETS,
  domainOf,
  type ColorPreset,
  type LightCaps,
  type SceneControls,
  type SceneValue,
  type WhitePreset,
} from "./model";
export {
  hasOnOff,
  lightCaps,
  readControls,
  writeControls,
  type ReadControlsOptions,
  type WriteControlsOptions,
} from "./controls";
export { extrasOf, type ExtrasOfOptions } from "./extras";
export {
  colorPresetOf,
  kelvinToCss,
  presetKelvin,
  toneOf,
  whitePresetOf,
  type PresetKelvinOptions,
  type ToneOfOptions,
  type WhitePresetOfOptions,
} from "./lightTones";
export { hasSingleTargetTemperature, type HasSingleTargetTemperatureOptions } from "./climate";
