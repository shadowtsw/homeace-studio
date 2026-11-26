/** Small words the formatters need, from the locale files. */
export type FormatTexts = {
  yes: string;
  no: string;
  hours: string;
  minutes: string;
  seconds: string;
};

const TIME_SEPARATOR = ":";
const LIST_SEPARATOR = ", ";
/** Longer JSON in a chip helps nobody; the technical view shows the whole block. */
const MAX_JSON_LENGTH = 60;

type DurationParts = { days?: number; hours?: number; minutes?: number; seconds?: number };

export type FormatDurationOptions = {
  /** "HH:MM:SS" (or "MM:SS"), seconds as a number, or `{ hours, minutes, seconds }`. */
  value: unknown;
  texts: FormatTexts;
};

/**
 * Turns an HA duration into short text.
 *
 * @returns e.g. "1 h 5 min" or "30 s"; "0 s" for zero; the raw text when it cannot be read.
 * @example formatDuration({ value: "00:05:00", texts }) // "5 min"
 */
export function formatDuration({ value, texts }: FormatDurationOptions): string {
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

export type JoinDurationOptions = {
  hours: number;
  minutes: number;
  seconds: number;
};

/**
 * The duration as HA's own editor writes it, e.g. `{ hours: 0, minutes: 5, seconds: 0 }`.
 * HA accepts that form everywhere a duration is allowed.
 */
export function joinDuration({ hours, minutes, seconds }: JoinDurationOptions): DurationParts {
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

export type FormatValueOptions = {
  /** The stored value. */
  value: unknown;
  /** e.g. `{ number: { unit_of_measurement: "°C" } }`; null formats generically. */
  selector: Record<string, unknown> | null;
  /** Entity ID → friendly name, for entity selectors. */
  entityNames: Record<string, string>;
  texts: FormatTexts;
};

/**
 * Formats a config value for a chip, using the field's HA selector to choose how.
 */
export function formatValue({ value, selector, entityNames, texts }: FormatValueOptions): string {
  const selectorType = selector ? Object.keys(selector)[0] : undefined;
  const options = (selectorType ? selector?.[selectorType] : undefined) as
    Record<string, unknown> | undefined;

  if (selectorType === "duration") return formatDuration({ value, texts });
  if (selectorType === "entity") return formatEntities({ value, entityNames });
  if (typeof value === "boolean") return value ? texts.yes : texts.no;

  if (selectorType === "number" && typeof value === "number") {
    const unit =
      typeof options?.unit_of_measurement === "string" ? options.unit_of_measurement : "";
    return `${value}${unit ? ` ${unit}` : ""}`;
  }

  return formatGeneric(value);
}

export type FormatEntitiesOptions = {
  value: unknown;
  entityNames: Record<string, string>;
};

/** One or more entity IDs as their friendly names, e.g. "Licht Terrasse, Gartenwege". */
export function formatEntities({ value, entityNames }: FormatEntitiesOptions): string {
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
