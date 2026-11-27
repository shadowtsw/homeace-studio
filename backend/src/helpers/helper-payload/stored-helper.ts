import { HELPER_TYPE, type HelperType } from "../helpers.constants";

import { DEFAULTS, TYPE_PAYLOADS, type HaPayload } from "./create-payload";
import type { HelperSettings } from "./settings";

/* Editing and copying stored helpers. */

/** The field HA keeps the storage id in; it never goes back into a command body. */
const STORAGE_ID_FIELD = "id";

/**
 * HA's field names the settings form of each type covers. Everything else a stored helper has
 * (name, icon, an `initial` of a number …) is kept as it is when saving.
 */
const SETTING_FIELDS: Record<HelperType, readonly string[]> = {
  [HELPER_TYPE.inputBoolean]: [],
  [HELPER_TYPE.inputButton]: [],
  [HELPER_TYPE.inputNumber]: ["min", "max", "step", "mode", "unit_of_measurement"],
  [HELPER_TYPE.inputText]: ["min", "max", "mode", "pattern"],
  [HELPER_TYPE.inputSelect]: ["options"],
  [HELPER_TYPE.inputDatetime]: ["has_date", "has_time"],
  [HELPER_TYPE.counter]: ["initial", "step", "minimum", "maximum", "restore"],
  [HELPER_TYPE.timer]: ["duration", "restore"],
};

/** HA stores timer durations like "0:05:00"; the form shows "00:05:00". */
const STORED_DURATION = /^(\d+):([0-5]\d):([0-5]\d)$/;
const DURATION_HOUR_DIGITS = 2;

export type HelperSettingsOfOptions = {
  type: HelperType;
  /** One entry of HA's `<type>/list`. */
  item: Record<string, unknown>;
};

/**
 * The settings of a stored helper as the form shows them (camelCase, "" for unset optional fields),
 * the reverse of buildHelperPayload.
 */
export function helperSettingsOf({ type, item }: HelperSettingsOfOptions): HelperSettings {
  const optional = (value: unknown): unknown => value ?? "";

  switch (type) {
    case HELPER_TYPE.inputNumber:
      return {
        min: item.min,
        max: item.max,
        step: item.step ?? DEFAULTS.numberStep,
        mode: item.mode ?? "slider",
        unitOfMeasurement: optional(item.unit_of_measurement),
      };
    case HELPER_TYPE.inputText:
      return {
        min: item.min ?? DEFAULTS.textMin,
        max: item.max ?? DEFAULTS.textMax,
        mode: item.mode ?? "text",
        pattern: optional(item.pattern),
      };
    case HELPER_TYPE.inputSelect: {
      const options: unknown[] = Array.isArray(item.options) ? item.options : [];
      return { options: [...options] };
    }
    case HELPER_TYPE.inputDatetime:
      return { hasDate: item.has_date ?? true, hasTime: item.has_time ?? true };
    case HELPER_TYPE.counter:
      return {
        initial: item.initial ?? DEFAULTS.counterInitial,
        step: item.step ?? DEFAULTS.counterStep,
        minimum: optional(item.minimum),
        maximum: optional(item.maximum),
        restore: item.restore ?? true,
      };
    case HELPER_TYPE.timer:
      return { duration: formDuration(item.duration), restore: item.restore ?? false };
    default:
      return {};
  }
}

export type BuildUpdatePayloadOptions = {
  type: HelperType;
  stored: Record<string, unknown>;
  settings: HelperSettings;
};

/**
 * The body for `<type>/update`. HA replaces the stored helper with it, so it carries everything the
 * form does not edit unchanged, plus the settings, checked like for creating.
 *
 * @throws HelperSettingsError naming the first invalid setting.
 */
export function buildUpdatePayload({
  type,
  stored,
  settings,
}: BuildUpdatePayloadOptions): HaPayload {
  const edited = new Set([STORAGE_ID_FIELD, ...SETTING_FIELDS[type]]);
  const kept = Object.fromEntries(Object.entries(stored).filter(([field]) => !edited.has(field)));

  return { ...kept, ...TYPE_PAYLOADS[type](settings) };
}

export type BuildCopyPayloadOptions = {
  stored: Record<string, unknown>;
  name: string;
};

/** The body for `<type>/create` of a copy: everything of the stored helper with a new name. */
export function buildCopyPayload({ stored, name }: BuildCopyPayloadOptions): HaPayload {
  const kept = Object.entries(stored).filter(([field]) => field !== STORAGE_ID_FIELD);

  return { ...Object.fromEntries(kept), name };
}

function formDuration(value: unknown): string {
  if (typeof value !== "string") return DEFAULTS.timerDuration;

  const match = STORED_DURATION.exec(value.trim());
  if (!match) return value;

  return `${match[1].padStart(DURATION_HOUR_DIGITS, "0")}:${match[2]}:${match[3]}`;
}
