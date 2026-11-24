import type { HelperSettings, HelperType } from "@/constants/helpers";

/** What is wrong with the settings: a key under helperSettings.problems, and the fields to mark. */
export type HelperSettingsProblem = { message: string; fields: string[] };

/** HA's own limit for input_text values. */
const TEXT_LIMIT = 255;
/** Duration of a timer as HH:MM:SS. */
const DURATION = /^\d{1,2}:[0-5]\d:[0-5]\d$/;

const problem = (message: string, ...fields: string[]): HelperSettingsProblem => ({
  message,
  fields,
});

/** A number the user typed; null when the field is empty or not a number. */
function numberOf(value: unknown): number | null {
  if (value === "" || value === null || value === undefined) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

/**
 * The first problem in a helper's settings, checked while typing. Mirrors what the backend checks
 * before saving (backend/src/helpers/helper-payload.ts), never more: a stricter check here could
 * block settings Home Assistant itself accepts.
 *
 * @returns null when the settings can be saved.
 */
export function helperSettingsProblem(
  type: HelperType,
  settings: HelperSettings,
): HelperSettingsProblem | null {
  switch (type) {
    case "input_number": {
      const min = numberOf(settings.min);
      const max = numberOf(settings.max);
      const step = numberOf(settings.step);
      if (min === null || max === null) return problem("minMaxMissing", "min", "max");
      if (max <= min) return problem("minMax", "min", "max");
      if (step !== null && step <= 0) return problem("step", "step");
      return null;
    }
    case "input_text": {
      const min = numberOf(settings.min) ?? 0;
      const max = numberOf(settings.max) ?? 0;
      if (min < 0 || !Number.isInteger(min)) return problem("textMin", "min");
      if (max > TEXT_LIMIT) return problem("textLimit", "max");
      if (max < min || !Number.isInteger(max)) return problem("textMinMax", "min", "max");
      return null;
    }
    case "input_select": {
      const options = Array.isArray(settings.options) ? settings.options.map((o) => o.trim()) : [];
      if (options.length === 0) return problem("optionsEmpty", "options");
      if (options.some((option) => option === "")) return problem("optionsBlank", "options");
      if (new Set(options).size !== options.length) return problem("optionsTwice", "options");
      return null;
    }
    case "input_datetime":
      return settings.hasDate || settings.hasTime
        ? null
        : problem("dateOrTime", "hasDate", "hasTime");
    case "counter": {
      const step = numberOf(settings.step);
      const minimum = numberOf(settings.minimum);
      const maximum = numberOf(settings.maximum);
      if (step !== null && (step <= 0 || !Number.isInteger(step))) return problem("step", "step");
      if (minimum !== null && maximum !== null && maximum < minimum) {
        return problem("minimumMaximum", "minimum", "maximum");
      }
      return null;
    }
    case "timer":
      return DURATION.test(String(settings.duration ?? "").trim())
        ? null
        : problem("duration", "duration");
    default:
      return null;
  }
}

/** Options of an input_select that are empty or appear twice, by index, to mark them. */
export function badOptionIndexes(options: readonly string[]): number[] {
  const trimmed = options.map((option) => option.trim());

  return trimmed.flatMap((option, index) =>
    option === "" || trimmed.indexOf(option) !== trimmed.lastIndexOf(option) ? [index] : [],
  );
}
