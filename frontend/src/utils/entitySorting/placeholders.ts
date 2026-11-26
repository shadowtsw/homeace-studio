import { cleanFolderPath } from "@/utils/categories/categoryPath";

import { RULE_PLACEHOLDER } from "./constants";

/** The placeholder words the UI shows, e.g. { area: "Bereich", floor: "Etage" }. */
export type PlaceholderWords = { area: string; floor: string };

export type ToDisplayTargetOptions = {
  target: string;
  words: PlaceholderWords;
};

/**
 * Rule targets store `{area}` and `{floor}`; the user reads and types them in their language.
 *
 * @example
 * toDisplayTarget({ target: "Licht/{area}", words: { area: "Bereich", floor: "Etage" } }) // "Licht/{Bereich}"
 */
export function toDisplayTarget({ target, words }: ToDisplayTargetOptions): string {
  return target
    .split(RULE_PLACEHOLDER.area)
    .join(`{${words.area}}`)
    .split(RULE_PLACEHOLDER.floor)
    .join(`{${words.floor}}`);
}

export type FromDisplayTargetOptions = {
  text: string;
  words: PlaceholderWords;
};

/** The way back, case-insensitive: "licht/{bereich}" → "licht/{area}". */
export function fromDisplayTarget({ text, words }: FromDisplayTargetOptions): string {
  const pattern = (word: string): RegExp =>
    new RegExp(`\\{\\s*${word.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\s*\\}`, "gi");

  return cleanFolderPath(
    text
      .replace(pattern(words.area), RULE_PLACEHOLDER.area)
      .replace(pattern(words.floor), RULE_PLACEHOLDER.floor),
  );
}
