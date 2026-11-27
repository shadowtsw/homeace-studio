import { checkThemeValue } from "./checkTheme";
import { themeFileValue, type CheckedTheme, type ThemeFileValue } from "./themeFormat";

/** Far more than anyone keeps; also stops a broken client from filling the overlay. */
export const MAX_OWN_THEMES = 20;

/** A theme the user made or imported, with its id ("own-" and twelve hex digits). */
export type OwnTheme = { id: string; theme: CheckedTheme };

/** How an own theme is stored and sent: the file fields plus its id. */
export type OwnThemeRecord = ThemeFileValue & { id: string };

const OWN_THEME_ID = /^own-[0-9a-f]{12}$/;
const ID_BYTES = 6;
const ID_FIELD = "id";

export function isOwnThemeId(value: unknown): value is string {
  return typeof value === "string" && OWN_THEME_ID.test(value);
}

/**
 * A new id for an own theme. Uses `crypto.getRandomValues`, which (unlike `randomUUID`) also exists
 * when HA is opened over plain http.
 */
export function newOwnThemeId(): string {
  const bytes = globalThis.crypto.getRandomValues(new Uint8Array(ID_BYTES));
  const hex = [...bytes].map((byte) => byte.toString(16).padStart(2, "0")).join("");

  return `own-${hex}`;
}

/**
 * A name no other theme has: the same name gets " (2)", " (3)" … instead of overwriting.
 *
 * @example uniqueThemeName({ name: "Abendrot", takenNames: ["Abendrot"] }) // "Abendrot (2)"
 */
export function uniqueThemeName({
  name,
  takenNames,
}: {
  name: string;
  takenNames: string[];
}): string {
  const taken = new Set(takenNames);
  if (!taken.has(name)) return name;

  let number = 2;
  while (taken.has(`${name} (${number})`)) number += 1;
  return `${name} (${number})`;
}

export function ownThemeRecord({ id, theme }: OwnTheme): OwnThemeRecord {
  return { ...themeFileValue(theme), id };
}

/** One stored own theme, checked again like a file; null when it is not usable. */
function readOwnTheme(value: unknown): OwnTheme | null {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return null;

  const entries: [string, unknown][] = Object.entries(value);
  const id = entries.find(([key]) => key === ID_FIELD)?.[1];
  if (!isOwnThemeId(id)) return null;

  const fileFields = Object.fromEntries(entries.filter(([key]) => key !== ID_FIELD));
  const result = checkThemeValue(fileFields);
  if (!result.isValid || !result.theme.name) return null;

  return { id, theme: result.theme };
}

/**
 * Own themes from storage or the backend, checked again: whatever is not a usable theme is left
 * out, and so are themes past MAX_OWN_THEMES and repeated ids.
 */
export function readOwnThemes(value: unknown): OwnTheme[] {
  if (!Array.isArray(value)) return [];

  const ownThemes: OwnTheme[] = [];
  const seenIds = new Set<string>();
  for (const stored of value.slice(0, MAX_OWN_THEMES)) {
    const ownTheme = readOwnTheme(stored);
    if (!ownTheme || seenIds.has(ownTheme.id)) continue;

    seenIds.add(ownTheme.id);
    ownThemes.push(ownTheme);
  }
  return ownThemes;
}
