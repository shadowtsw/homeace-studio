/** HA's climate feature bits (`ClimateEntityFeature`): one target temperature, a low/high range. */
const CLIMATE_FEATURE = { targetTemperature: 1, targetTemperatureRange: 2 } as const;
/** The mode in which a thermostat with a range works with a low and a high limit. */
const RANGE_MODE = "heat_cool";

const hasFeature = ({ features, bit }: { features: number; bit: number }): boolean =>
  Math.floor(features / bit) % 2 === 1;

export type HasSingleTargetTemperatureOptions = {
  attributes: Record<string, unknown> | undefined;
  hvacMode: string | null;
};

/**
 * Whether a thermostat takes one target temperature in the chosen mode: it must support one, and a
 * device with a low/high range uses the range in "heat_cool". Without `supported_features` one
 * temperature is assumed, as before.
 */
export function hasSingleTargetTemperature({
  attributes,
  hvacMode,
}: HasSingleTargetTemperatureOptions): boolean {
  const features = attributes?.supported_features;
  if (typeof features !== "number") return true;
  if (!hasFeature({ features, bit: CLIMATE_FEATURE.targetTemperature })) return false;

  return !(
    hasFeature({ features, bit: CLIMATE_FEATURE.targetTemperatureRange }) && hvacMode === RANGE_MODE
  );
}
