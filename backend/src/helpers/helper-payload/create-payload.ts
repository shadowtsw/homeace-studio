import { HELPER_TYPE, type HelperType } from "../helpers.constants";

import {
  HelperSettingsError,
  readBoolean,
  readChoice,
  readInteger,
  readNumber,
  readOptionalInteger,
  readOptionalString,
  type HelperSettings,
} from "./settings";

/** A command body in HA's field names. */
export type HaPayload = Record<string, unknown>;

/** Duration of a timer as HH:MM:SS. */
const DURATION_PATTERN = /^\d{1,2}:[0-5]\d:[0-5]\d$/;
const INPUT_NUMBER_MODES = ["slider", "box"];
const INPUT_TEXT_MODES = ["text", "password"];
/** HA's own limit for input_text values. */
const INPUT_TEXT_MAX_LIMIT = 255;

/** HA's values for unset settings; also used when a stored helper is read back for the form. */
export const DEFAULTS = {
  numberStep: 1,
  textMin: 0,
  textMax: 100,
  counterInitial: 0,
  counterStep: 1,
  timerDuration: "00:00:00",
} as const;

export type BuildHelperPayloadOptions = {
  /** Which helper to create. */
  type: HelperType;
  /** Display name; HA derives the entity ID from it. */
  name: string;
  /** Optional "mdi:…" icon. */
  icon: string | undefined;
  /** Type-specific settings, e.g. `{ min: 0, max: 100 }` for input_number. */
  settings: HelperSettings;
};

/**
 * Builds the body for HA's `<type>/create` command from what the user entered.
 *
 * @returns The payload in HA's field names (snake_case).
 * @throws HelperSettingsError naming the first invalid setting.
 */
export function buildHelperPayload({
  type,
  name,
  icon,
  settings,
}: BuildHelperPayloadOptions): HaPayload {
  const common: HaPayload = icon ? { name, icon } : { name };

  return { ...common, ...TYPE_PAYLOADS[type](settings) };
}

/** The settings part of the payload per helper type, checked; used for creating and updating. */
export const TYPE_PAYLOADS: Record<HelperType, (settings: HelperSettings) => HaPayload> = {
  [HELPER_TYPE.inputBoolean]: () => ({}),
  [HELPER_TYPE.inputButton]: () => ({}),
  [HELPER_TYPE.inputNumber]: inputNumberPayload,
  [HELPER_TYPE.inputText]: inputTextPayload,
  [HELPER_TYPE.inputSelect]: inputSelectPayload,
  [HELPER_TYPE.inputDatetime]: inputDatetimePayload,
  [HELPER_TYPE.counter]: counterPayload,
  [HELPER_TYPE.timer]: timerPayload,
};

function inputNumberPayload(settings: HelperSettings): HaPayload {
  const min = readNumber({ settings, field: "min" });
  const max = readNumber({ settings, field: "max" });
  const step = readNumber({ settings, field: "step", fallback: DEFAULTS.numberStep });
  const mode = readChoice({
    settings,
    field: "mode",
    choices: INPUT_NUMBER_MODES,
    fallback: "slider",
  });
  const unit = readOptionalString({ settings, field: "unitOfMeasurement" });

  if (max <= min) throw new HelperSettingsError("max");
  if (step <= 0) throw new HelperSettingsError("step");

  return { min, max, step, mode, ...(unit ? { unit_of_measurement: unit } : {}) };
}

function inputTextPayload(settings: HelperSettings): HaPayload {
  const min = readInteger({ settings, field: "min", fallback: DEFAULTS.textMin });
  const max = readInteger({ settings, field: "max", fallback: DEFAULTS.textMax });
  const mode = readChoice({ settings, field: "mode", choices: INPUT_TEXT_MODES, fallback: "text" });
  const pattern = readOptionalString({ settings, field: "pattern" });

  if (min < 0) throw new HelperSettingsError("min");
  if (max < min || max > INPUT_TEXT_MAX_LIMIT) throw new HelperSettingsError("max");

  return { min, max, mode, ...(pattern ? { pattern } : {}) };
}

function inputSelectPayload(settings: HelperSettings): HaPayload {
  const raw = settings.options;

  if (!Array.isArray(raw)) throw new HelperSettingsError("options");

  const options = raw.map((option) => (typeof option === "string" ? option.trim() : ""));
  const hasBlank = options.some((option) => option === "");
  const hasDuplicates = new Set(options).size !== options.length;

  if (options.length === 0 || hasBlank || hasDuplicates) throw new HelperSettingsError("options");

  return { options };
}

function inputDatetimePayload(settings: HelperSettings): HaPayload {
  const hasDate = readBoolean({ settings, field: "hasDate", fallback: true });
  const hasTime = readBoolean({ settings, field: "hasTime", fallback: true });

  // HA needs at least one of the two.
  if (!hasDate && !hasTime) throw new HelperSettingsError("hasDate");

  return { has_date: hasDate, has_time: hasTime };
}

function counterPayload(settings: HelperSettings): HaPayload {
  const initial = readInteger({ settings, field: "initial", fallback: DEFAULTS.counterInitial });
  const step = readInteger({ settings, field: "step", fallback: DEFAULTS.counterStep });
  const minimum = readOptionalInteger({ settings, field: "minimum" });
  const maximum = readOptionalInteger({ settings, field: "maximum" });
  const restore = readBoolean({ settings, field: "restore", fallback: true });

  if (step <= 0) throw new HelperSettingsError("step");
  if (minimum !== undefined && maximum !== undefined && maximum < minimum) {
    throw new HelperSettingsError("maximum");
  }

  return {
    initial,
    step,
    restore,
    ...(minimum !== undefined ? { minimum } : {}),
    ...(maximum !== undefined ? { maximum } : {}),
  };
}

function timerPayload(settings: HelperSettings): HaPayload {
  const duration = readOptionalString({ settings, field: "duration" }) ?? DEFAULTS.timerDuration;
  const restore = readBoolean({ settings, field: "restore", fallback: false });

  if (!DURATION_PATTERN.test(duration)) throw new HelperSettingsError("duration");

  return { duration, restore };
}
