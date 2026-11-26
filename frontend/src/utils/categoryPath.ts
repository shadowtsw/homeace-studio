import { CATEGORY_SEPARATOR } from "@/constants/entries";

/**
 * Whether `path` is `ancestor` itself or lies below it. Compares whole levels, so "Hausflur" is
 * not below "Haus". Same rule as the backend (categories/category-path.ts).
 */
export function isSameOrBelow(path: string, ancestor: string): boolean {
  return path === ancestor || path.startsWith(ancestor + CATEGORY_SEPARATOR);
}

/**
 * Swaps the leading `from` part of a path for `to`.
 *
 * @example replacePathPrefix("Haus/Terrasse", "Haus", "Heim") // "Heim/Terrasse"
 */
export function replacePathPrefix(path: string, from: string, to: string): string {
  return to + path.slice(from.length);
}

/**
 * The path of a folder after giving its last level a new name.
 *
 * @example renameLastLevel("Haus/Terrasse", "Balkon") // "Haus/Balkon"
 */
export function renameLastLevel(path: string, newName: string): string {
  const levels = path.split(CATEGORY_SEPARATOR);
  levels[levels.length - 1] = newName;

  return levels.join(CATEGORY_SEPARATOR);
}

/**
 * Color a folder shows: its own, else that of the nearest parent with one, else null (default).
 * Saves coloring every subfolder by hand.
 *
 * @example folderColor("Haus/Terrasse/Licht", { Haus: "#c9862f" }) // "#c9862f"
 */
export function folderColor(path: string, colors: Readonly<Record<string, string>>): string | null {
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
