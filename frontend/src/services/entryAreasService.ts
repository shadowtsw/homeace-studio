import { apiFetch } from "./api";

/** Why an entry is in an area: its own, through what it uses, or through who uses it. */
export type AreaSource = "own" | "uses" | "usedBy";

export type EntryAreaLink = {
  areaId: string;
  name: string;
  source: AreaSource;
  /** The device or flow that brought the area in; null for its own area. */
  via: { entityId: string; name: string } | null;
};

export type EntryAreas = { entityId: string; areas: EntryAreaLink[] };

export function fetchEntryAreas(): Promise<EntryAreas[]> {
  return apiFetch<EntryAreas[]>({ path: "/entry-areas" });
}
