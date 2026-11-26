import { CATEGORY_SEPARATOR } from "@/constants/entries";
import type { EntryAreaLink } from "@/services/entryAreasService";
import type { Entry } from "@/types/entry";

/** One entry "Ordnung in einem Klick" would move into the folder of its area. */
export type TidyMove = {
  entry: Entry;
  /** Every area the entry is in; more than one lets the user pick. */
  areas: readonly EntryAreaLink[];
  /** The area it goes by: the picked one, else the first (most used). */
  area: EntryAreaLink;
  /** Folder path it moves to. */
  to: string;
  /** The folder does not exist yet; HA gets the category on the first move. */
  isNewFolder: boolean;
};

export type TidyInput = {
  entries: readonly Entry[];
  linksOf: (entityId: string) => readonly EntryAreaLink[];
  /** Every existing folder path. */
  folderPaths: readonly string[];
  /** Only entries without a folder; else also those that are in another folder. */
  isOnlyUncategorized: boolean;
  /** Area picked by the user for entries in several areas, by entity ID. */
  picks: Readonly<Record<string, string>>;
};

/**
 * The folder an area goes to: an existing one named like the area (also deeper, e.g. "Haus/Terrasse"
 * for "Terrasse"; the shortest wins), else a new top-level folder with the area's name.
 */
export function folderForArea(areaName: string, folderPaths: readonly string[]): string {
  const name = areaName.toLocaleLowerCase();
  const matches = folderPaths.filter((path) => {
    const lower = path.toLocaleLowerCase();
    return lower === name || lower.endsWith(CATEGORY_SEPARATOR + name);
  });
  const [best] = [...matches].sort(
    (a, b) => a.split(CATEGORY_SEPARATOR).length - b.split(CATEGORY_SEPARATOR).length,
  );

  return best ?? areaName;
}

/** Entries that can be sorted by area: they have one and HA lets them have a category. */
export function tidyCandidates(input: Pick<TidyInput, "entries" | "linksOf">): Entry[] {
  return input.entries.filter(
    (entry) => entry.isInRegistry && input.linksOf(entry.entityId).length > 0,
  );
}

/**
 * What "Ordnung in einem Klick" would do. Entries already in the right folder are left out; nothing
 * is deleted.
 *
 * @returns One move per entry, in the order of the entries.
 */
export function planAreaTidy(input: TidyInput): TidyMove[] {
  const existing = new Set(input.folderPaths.map((path) => path.toLocaleLowerCase()));
  const moves: TidyMove[] = [];

  for (const entry of tidyCandidates(input)) {
    if (input.isOnlyUncategorized && entry.categoryPath !== null) continue;

    const areas = input.linksOf(entry.entityId);
    const picked = areas.find((link) => link.areaId === input.picks[entry.entityId]);
    const area = picked ?? areas[0];
    if (!area) continue;

    const to = folderForArea(area.name, input.folderPaths);
    if (to === entry.categoryPath) continue;

    moves.push({ entry, areas, area, to, isNewFolder: !existing.has(to.toLocaleLowerCase()) });
  }

  return moves;
}
