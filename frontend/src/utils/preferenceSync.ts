import type { Preference } from "@/constants/preferences";

/** Everything HomeAce Studio keeps in the browser starts with this; the backend names drop it. */
const STORAGE_KEY_PREFIX = "homeace.";

/**
 * The name a preference has in the backend, e.g. "technicalDetails" for "homeace.technicalDetails".
 *
 * @param preference - An entry from PREFERENCES.
 */
export function preferenceName(preference: Preference): string {
  return preference.storageKey.startsWith(STORAGE_KEY_PREFIX)
    ? preference.storageKey.slice(STORAGE_KEY_PREFIX.length)
    : preference.storageKey;
}

export type KeptPreference = {
  name: string;
  value: unknown;
  /** Whether the browser has a value of its own; a default it never stored is no choice. */
  isStored: boolean;
};

/**
 * The values this browser can hand to the backend: only those the browser really stored, so a
 * default (e.g. the browser language before the user picked one) does not become a choice.
 *
 * @param kept - The preferences of scope "user" with their current values.
 * @param exceptNames - Names the backend already has; they are left out.
 * @returns Name → value.
 */
export function valuesToHandOver(
  kept: readonly KeptPreference[],
  exceptNames: ReadonlySet<string> = new Set(),
): Record<string, unknown> {
  const storedPreferences = kept.filter(
    (preference) => preference.isStored && !exceptNames.has(preference.name),
  );

  return Object.fromEntries(storedPreferences.map(({ name, value }) => [name, value]));
}

/** Compares two plain values (booleans, numbers, strings, also small objects). */
export function isSameValue(first: unknown, second: unknown): boolean {
  return JSON.stringify(first) === JSON.stringify(second);
}
