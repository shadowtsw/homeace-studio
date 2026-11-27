import { formatNumber, formatWithUnit } from "@/utils/formatNumber";

/** Small words the formatters need, from the locale files. */
export type FormatTexts = {
  yes: string;
  no: string;
  hours: string;
  minutes: string;
  seconds: string;
  /** The UI language, so numbers read "21,5" in German and "21.5" in English. */
  locale: string;
  /** "25 %" in German, "25%" in English, for an already formatted "25". */
  percent: (value: string) => string;
};

const TIME_SEPARATOR = ":";
const LIST_SEPARATOR = ", ";
/** Longer JSON in a chip helps nobody; the technical view shows the whole block. */
const MAX_JSON_LENGTH = 60;

type DurationParts = { days?: number; hours?: number; minutes?: number; seconds?: number };

/**
 * Turns an HA duration into short text.
 *
 * @param value - "HH:MM:SS" (or "MM:SS"), seconds as a number, or `{ hours, minutes, seconds }`.
 * @returns e.g. "1 h 5 min" or "30 s"; "0 s" for zero; the raw text when it cannot be read.
 * @example formatDuration("00:05:00", texts) // "5 min"
 */
export function formatDuration(value: unknown, texts: FormatTexts): string {
  const parts = toDurationParts(value);

  if (!parts) return String(value);

  const totalHours = (parts.days ?? 0) * 24 + (parts.hours ?? 0);
  const pieces = [
    totalHours ? `${totalHours} ${texts.hours}` : "",
    parts.minutes ? `${parts.minutes} ${texts.minutes}` : "",
    parts.seconds ? `${parts.seconds} ${texts.seconds}` : "",
  ].filter(Boolean);

  return pieces.length ? pieces.join(" ") : `0 ${texts.seconds}`;
}

/**
 * Splits an HA duration into whole hours, minutes and seconds, for the duration editor.
 *
 * @returns null when the value is no duration (e.g. a template).
 * @example splitDuration("01:30:00") // { hours: 1, minutes: 30, seconds: 0 }
 */
export function splitDuration(
  value: unknown,
): { hours: number; minutes: number; seconds: number } | null {
  const parts = value === undefined ? {} : toDurationParts(value);

  if (!parts) return null;

  const total =
    ((parts.days ?? 0) * 24 + (parts.hours ?? 0)) * 3600 +
    (parts.minutes ?? 0) * 60 +
    (parts.seconds ?? 0);

  return {
    hours: Math.floor(total / 3600),
    minutes: Math.floor((total % 3600) / 60),
    seconds: Math.round(total % 60),
  };
}

/**
 * The duration as HA's own editor writes it, e.g. `{ hours: 0, minutes: 5, seconds: 0 }`.
 * HA accepts that form everywhere a duration is allowed.
 */
export function joinDuration(hours: number, minutes: number, seconds: number): DurationParts {
  return { hours, minutes, seconds };
}

function toDurationParts(value: unknown): DurationParts | null {
  if (typeof value === "number") return { seconds: value };
  if (value && typeof value === "object") return value as DurationParts;
  if (typeof value !== "string") return null;

  const numbers = value.split(TIME_SEPARATOR).map(Number);

  if (numbers.some(Number.isNaN)) return null;

  const [seconds = 0, minutes = 0, hours = 0] = numbers.reverse();

  return { hours, minutes, seconds };
}

/**
 * Formats a config value for a chip, using the field's HA selector to choose how.
 *
 * @param value - The stored value.
 * @param selector - e.g. `{ number: { unit_of_measurement: "°C" } }`; null formats generically.
 * @param entityNames - Entity ID → friendly name, for entity selectors.
 */
export function formatValue(
  value: unknown,
  selector: Record<string, unknown> | null,
  entityNames: Record<string, string>,
  texts: FormatTexts,
): string {
  const selectorType = selector ? Object.keys(selector)[0] : undefined;
  const options = (selectorType ? selector?.[selectorType] : undefined) as
    Record<string, unknown> | undefined;

  if (selectorType === "duration") return formatDuration(value, texts);
  if (selectorType === "entity") return formatEntities(value, entityNames);
  if (typeof value === "boolean") return value ? texts.yes : texts.no;

  if (selectorType === "number" && typeof value === "number") {
    const unit =
      typeof options?.unit_of_measurement === "string" ? options.unit_of_measurement : "";
    return unit
      ? formatWithUnit({ value, unit, locale: texts.locale, percent: texts.percent })
      : formatNumber({ value, locale: texts.locale });
  }
  // A number without a selector, e.g. a limit like "über 21,5"
  if (typeof value === "number") return formatNumber({ value, locale: texts.locale });

  return formatGeneric(value);
}

/** One or more entity IDs as their friendly names, e.g. "Licht Terrasse, Gartenwege". */
export function formatEntities(value: unknown, entityNames: Record<string, string>): string {
  const ids = Array.isArray(value) ? value : [value];

  return ids.map((id) => entityNames[String(id)] ?? String(id)).join(LIST_SEPARATOR);
}

function formatGeneric(value: unknown): string {
  if (Array.isArray(value)) return value.map(formatGeneric).join(LIST_SEPARATOR);
  if (value && typeof value === "object") {
    const json = JSON.stringify(value);
    return json.length > MAX_JSON_LENGTH ? `${json.slice(0, MAX_JSON_LENGTH)}…` : json;
  }

  return String(value);
}
