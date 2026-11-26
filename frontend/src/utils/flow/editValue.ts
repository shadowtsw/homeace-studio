/** Helpers that turn what the user picked or typed into the value HA expects. */

const SECONDS_SUFFIX = ":00";
/** "07:30" without seconds; HA's time fields store "07:30:00". */
const SHORT_TIME = /^\d{1,2}:\d{2}$/;

export type ListValueOptions = {
  selected: string[];
  original: unknown;
};

/**
 * The value of a list pick. One entity stays a plain string when it was one before (keeps the
 * config as the user wrote it); several become a list; none removes the value.
 *
 * @example listValue({ selected: ["light.a"], original: "light.b" }) // "light.a"
 * @example
 * listValue({ selected: ["light.a", "light.b"], original: "light.b" }) // ["light.a", "light.b"]
 */
export function listValue({ selected, original }: ListValueOptions): unknown {
  if (selected.length === 0) return undefined;
  if (selected.length === 1 && !Array.isArray(original)) return selected[0];

  return selected;
}

/** The values a stored value stands for, as strings: "a" → ["a"], ["a", "b"] → ["a", "b"]. */
export function selectedValues(value: unknown): string[] {
  if (value === undefined || value === null) return [];

  return (Array.isArray(value) ? value : [value]).map(String);
}

/** @example timeValue("7:30") // "7:30:00" */
export function timeValue(input: string): string | undefined {
  const trimmed = input.trim();

  if (!trimmed) return undefined;

  return SHORT_TIME.test(trimmed) ? trimmed + SECONDS_SUFFIX : trimmed;
}

/** A typed number; undefined for an empty or unreadable field (removes the value). */
export function numberValue(input: string | number): number | undefined {
  if (typeof input === "number") return Number.isFinite(input) ? input : undefined;

  const normalized = input.trim().replace(",", ".");

  if (!normalized) return undefined;

  const parsed = Number(normalized);

  return Number.isFinite(parsed) ? parsed : undefined;
}

/** Typed text; an empty field removes the value. */
export function textValue(input: string): string | undefined {
  return input.trim() === "" ? undefined : input;
}
