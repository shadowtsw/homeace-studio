import type { PreferenceValue, UserPreferences } from "../overlay/overlay.model";

/** A preference name like "locale" or "technicalDetails"; the frontend decides which exist. */
const PREFERENCE_NAME = /^[a-zA-Z][a-zA-Z0-9]{0,39}$/;
/** A value is a flag, a word or a number; a string past this length is no setting. */
export const MAX_PREFERENCE_TEXT_LENGTH = 200;
/** Far more than HomeAce Studio has; keeps a broken client from filling the overlay. */
export const MAX_PREFERENCES_PER_USER = 50;

export function isPreferenceName(name: string): boolean {
  return PREFERENCE_NAME.test(name);
}

/** Only plain values are kept: booleans, finite numbers and short strings. */
export function isPreferenceValue(value: unknown): value is PreferenceValue {
  if (typeof value === "boolean") return true;
  if (typeof value === "number") return Number.isFinite(value);
  if (typeof value === "string") return value.length <= MAX_PREFERENCE_TEXT_LENGTH;

  return false;
}

/**
 * The valid part of values a client sent: entries with a bad name or value are dropped, and at most
 * MAX_PREFERENCES_PER_USER are kept.
 *
 * @param values - Anything from a request body.
 * @returns A clean object; empty for anything that is not an object.
 */
export function cleanPreferences(values: unknown): UserPreferences {
  if (!values || typeof values !== "object" || Array.isArray(values)) return {};

  const validEntries = Object.entries(values).filter(
    (entry): entry is [string, PreferenceValue] =>
      isPreferenceName(entry[0]) && isPreferenceValue(entry[1]),
  );
  const keptEntries = validEntries.slice(0, MAX_PREFERENCES_PER_USER);

  return Object.fromEntries(keptEntries);
}
