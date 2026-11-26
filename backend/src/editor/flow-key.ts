/** German letters HA's own slugify writes out as well. */
const LETTER_MAP: Record<string, string> = { ä: "ae", ö: "oe", ü: "ue", ß: "ss" };
const SPECIAL_LETTERS = /[äöüß]/g;
const ACCENTS = /[̀-ͯ]/g;
const NOT_KEY_CHARACTERS = /[^a-z0-9]+/g;
const EDGE_UNDERSCORES = /^_+|_+$/g;
const FALLBACK_KEY = "script";
const SUFFIX_SEPARATOR = "_";
/** The first duplicate gets "_2", like HA does for entity IDs. */
const FIRST_SUFFIX = 2;

/**
 * Turns a name into a script key (scripts.yaml key and object ID of the entity).
 *
 * @example scriptKeyFor("Gute Nacht – Wohnzimmer") // "gute_nacht_wohnzimmer"
 * @example scriptKeyFor("Größe ändern") // "groesse_aendern"
 */
export function scriptKeyFor(name: string): string {
  const key = name
    .toLowerCase()
    .replace(SPECIAL_LETTERS, (letter) => LETTER_MAP[letter] ?? letter)
    .normalize("NFD")
    .replace(ACCENTS, "")
    .replace(NOT_KEY_CHARACTERS, "_")
    .replace(EDGE_UNDERSCORES, "");

  return key || FALLBACK_KEY;
}

export type FirstFreeKeyOptions = {
  base: string;
  /** Asks HA whether a key is in use. */
  isTaken: (key: string) => Promise<boolean>;
};

/**
 * The first key that is not taken yet: "gute_nacht", then "gute_nacht_2", "gute_nacht_3", …
 */
export async function firstFreeKey({ base, isTaken }: FirstFreeKeyOptions): Promise<string> {
  let key = base;

  for (let suffix = FIRST_SUFFIX; await isTaken(key); suffix++) {
    key = base + SUFFIX_SEPARATOR + suffix;
  }

  return key;
}
