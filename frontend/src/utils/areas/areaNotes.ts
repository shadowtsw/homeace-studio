import type { AreaSource, EntryAreaLink } from "@/services/entryAreasService";

/** What the list shows while an area of the area view is selected. */
export type AreaListView = {
  name: string;
  subtitle: string;
  /** Why each entry is in the area, by entity ID; empty for entries with the area as their own. */
  notes: Record<string, string>;
};

export type AreaNoteTexts = {
  /** "über Bewegungsmelder Terrasse", "benutzt von „Gute Nacht“". */
  via: (source: Exclude<AreaSource, "own">, name: string) => string;
  /** "auch in Garten, Flur". */
  alsoIn: (names: string) => string;
};

const NOTE_SEPARATOR = " · ";

/**
 * Why an entry is in the selected area, and where else it is.
 *
 * @example areaNote(links, "terrace", texts) // "über Bewegungsmelder Terrasse · auch in Garten"
 */
export function areaNote(
  links: readonly EntryAreaLink[],
  areaId: string,
  texts: AreaNoteTexts,
): string {
  const here = links.find((link) => link.areaId === areaId);
  const others = links.filter((link) => link.areaId !== areaId).map((link) => link.name);
  const parts = [
    here?.via && here.source !== "own" ? texts.via(here.source, here.via.name) : "",
    others.length > 0 ? texts.alsoIn(others.join(", ")) : "",
  ];

  return parts.filter(Boolean).join(NOTE_SEPARATOR);
}
