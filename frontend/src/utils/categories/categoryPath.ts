import { CATEGORY_SEPARATOR } from "@/constants/entries";

export type IsSameOrBelowOptions = {
  path: string;
  ancestor: string;
};

/**
 * Whether `path` is `ancestor` itself or lies below it. Compares whole levels, so "Hausflur" is
 * not below "Haus". Same rule as the backend (categories/category-path.ts).
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

export type RenameLastLevelOptions = {
  path: string;
  newName: string;
};

/**
 * The path of a folder after giving its last level a new name.
 *
 * @example renameLastLevel({ path: "Haus/Terrasse", newName: "Balkon" }) // "Haus/Balkon"
 */
export function renameLastLevel({ path, newName }: RenameLastLevelOptions): string {
  const levels = path.split(CATEGORY_SEPARATOR);
  levels[levels.length - 1] = newName;

  return levels.join(CATEGORY_SEPARATOR);
}

export type FolderColorOptions = {
  path: string;
  colors: Readonly<Record<string, string>>;
};

/**
 * Color a folder shows: its own, else that of the nearest parent with one, else null (default).
 * Saves coloring every subfolder by hand.
 *
 * @example folderColor({ path: "Haus/Terrasse/Licht", colors: { Haus: "#c9862f" } }) // "#c9862f"
 */
export function folderColor({ path, colors }: FolderColorOptions): string | null {
  const levels = path.split(CATEGORY_SEPARATOR);

  for (let depth = levels.length; depth > 0; depth--) {
    const color = colors[levels.slice(0, depth).join(CATEGORY_SEPARATOR)];

    if (color) return color;
  }

  return null;
}

/** Last level of a path, e.g. "Terrasse" for "Haus/Terrasse". */
export function lastLevel(path: string): string {
  return path.split(CATEGORY_SEPARATOR).pop() ?? path;
}

/**
 * A folder path as the user meant it: levels trimmed, empty ones dropped, so a slip like "Küche/",
 * "/Küche" or "Haus//Licht" still names a real folder. Empty when nothing is left.
 *
 * @example cleanFolderPath(" Haus / Küche/ ") // "Haus/Küche"
 */
export function cleanFolderPath(path: string): string {
  return path
    .split(CATEGORY_SEPARATOR)
    .map((level) => level.trim())
    .filter(Boolean)
    .join(CATEGORY_SEPARATOR);
}
