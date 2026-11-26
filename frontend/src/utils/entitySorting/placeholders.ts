import { cleanFolderPath } from "@/utils/categories/categoryPath";

import { RULE_PLACEHOLDER } from "./constants";

/** The placeholder words the UI shows, e.g. { area: "Bereich", floor: "Etage" }. */
export type PlaceholderWords = { area: string; floor: string };

/**
 * Rule targets store `{area}` and `{floor}`; the user reads and types them in their language.
 *
 * @example toDisplayTarget("Licht/{area}", { area: "Bereich", floor: "Etage" }) // "Licht/{Bereich}"
 */
export function toDisplayTarget(target: string, words: PlaceholderWords): string {
  return target
    .split(RULE_PLACEHOLDER.area)
    .join(`{${words.area}}`)
    .split(RULE_PLACEHOLDER.floor)
    .join(`{${words.floor}}`);
}

/** The way back, case-insensitive: "licht/{bereich}" → "licht/{area}". */
export function fromDisplayTarget(text: string, words: PlaceholderWords): string {
  const pattern = (word: string): RegExp =>
    new RegExp(`\\{\\s*${word.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\s*\\}`, "gi");

  return cleanFolderPath(
    text
      .replace(pattern(words.area), RULE_PLACEHOLDER.area)
      .replace(pattern(words.floor), RULE_PLACEHOLDER.floor),
  );
}
