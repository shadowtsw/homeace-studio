import { STOP_WORDS } from "./constants";

const MIN_WORD_LENGTH = 3;
const WORD_SPLIT = /[\s_\-.!/()]+/;
const DIGITS_ONLY = /^\d+$/;

/** "Küche" → "kueche"; how words are compared, so "kueche", "Küche" and "KÜCHE" are one. */
export function wordKey(text: string): string {
  return text
    .toLowerCase()
    .replace(/ä/g, "ae")
    .replace(/ö/g, "oe")
    .replace(/ü/g, "ue")
    .replace(/ß/g, "ss")
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "");
}

/**
 * The words of a name that can say where it belongs, by key, with their spelling as written.
 * Short words, numbers and words like "sensor" are left out.
 *
 * @example meaningfulWords("Küche Kühlschrank 2") // Map { "kueche" → "Küche", "kuehlschrank" → "Kühlschrank" }
 */
export function meaningfulWords(name: string): Map<string, string> {
  const words = new Map<string, string>();

  for (const word of name.split(WORD_SPLIT)) {
    const key = wordKey(word);
    const isMeaningful =
      key.length >= MIN_WORD_LENGTH && !DIGITS_ONLY.test(key) && !STOP_WORDS.has(key);

    if (isMeaningful && !words.has(key)) words.set(key, word);
  }

  return words;
}
