/** Everything HomeAce Studio keeps in the browser starts with this. */
export const STORAGE_PREFIX = "homeace.";

let hadEarlierVisitAtStart = false;

/**
 * Whether a browser's storage already has keys of HomeAce Studio, apart from `ignoredKey`.
 *
 * @param keys - The storage keys.
 * @param ignoredKey - A key that does not count, e.g. the one about to be checked.
 */
export function hasOwnKeys(keys: readonly string[], ignoredKey: string): boolean {
  return keys.some((key) => key.startsWith(STORAGE_PREFIX) && key !== ignoredKey);
}

/**
 * Remembers whether HomeAce Studio was opened in this browser before. Must run before any store
 * exists, because the stores write their defaults right away (main.ts calls it first).
 *
 * @param ignoredKey - A key that does not count as an earlier visit.
 */
export function captureEarlierVisit(ignoredKey: string): void {
  try {
    const keys = Array.from({ length: localStorage.length }, (_, index) => localStorage.key(index));
    hadEarlierVisitAtStart = hasOwnKeys(
      keys.filter((key): key is string => key !== null),
      ignoredKey,
    );
  } catch {
    // Storage blocked (private mode, sandbox): treat it as a first visit.
    hadEarlierVisitAtStart = false;
  }
}

/** What captureEarlierVisit() found when the app started. */
export function hadEarlierVisit(): boolean {
  return hadEarlierVisitAtStart;
}
