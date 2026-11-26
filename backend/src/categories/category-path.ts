import { CATEGORY_SEPARATOR } from "./categories.constants";

/**
 * Cleans a category path typed by a user: trims every level and joins them with "/".
 *
 * @param path - e.g. " Haus / Terrasse ".
 * @returns The clean path ("Haus/Terrasse"), or null when any level is empty ("Haus//Terrasse", "").
 */
export function normalizeCategoryPath(path: string): string | null {
  const levels = path.split(CATEGORY_SEPARATOR).map((level) => level.trim());
  const hasEmptyLevel = levels.some((level) => level === "");

  return hasEmptyLevel ? null : levels.join(CATEGORY_SEPARATOR);
}

export type IsSameOrBelowOptions = {
  path: string;
  ancestor: string;
};

/**
 * Whether `path` is `ancestor` itself or lies below it. Compares whole levels, so "Hausflur" is not
 * below "Haus".
 */
export function isSameOrBelow({ path, ancestor }: IsSameOrBelowOptions): boolean {
  return path === ancestor || path.startsWith(ancestor + CATEGORY_SEPARATOR);
}

export type ReplacePathPrefixOptions = {
  path: string;
  from: string;
  to: string;
};

/**
 * Swaps the leading `from` part of a path for `to`.
 *
 * @example
 * replacePathPrefix({ path: "Haus/Terrasse", from: "Haus", to: "Heim" }) // "Heim/Terrasse"
 */
export function replacePathPrefix({ path, from, to }: ReplacePathPrefixOptions): string {
  return to + path.slice(from.length);
}
