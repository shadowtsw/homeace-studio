/** Mirrors `backend/src/entries/entry.model.ts` (GET /api/entries). */

export type EntryKind = "automation" | "script" | "scene" | "helper";

export type EntryArea = {
  areaId: string;
  name: string;
};

export type EntryLabel = {
  labelId: string;
  name: string;
  /** HA theme color name like "indigo" or a hex value; null when unset. */
  color: string | null;
};

export type Entry = {
  entityId: string;
  kind: EntryKind;
  domain: string;
  name: string;
  /** HA icon name like "mdi:lightbulb"; null means "use the default icon of the kind". */
  icon: string | null;
  categoryId: string | null;
  /** Full HA category name, e.g. "Haus/Terrasse"; null when not categorized. */
  categoryPath: string | null;
  labels: EntryLabel[];
  area: EntryArea | null;
  state: string | null;
  isDisabled: boolean;
  isHidden: boolean;
  /** False for YAML entities without unique_id: no category, labels or area possible. */
  isInRegistry: boolean;
  /** Own extras (overlay); HA does not know about them. */
  isFavorite: boolean;
  note: string | null;
};

/** Changes to name, icon, area or labels; missing fields stay as they are. */
export type EntryChanges = {
  name?: string | null;
  icon?: string | null;
  areaId?: string | null;
  labelIds?: string[];
  /** Other names for Assist. */
  aliases?: string[];
  /** Hidden in dashboards HA builds itself. */
  isHidden?: boolean;
  /** HA does not load the entity at all. */
  isDisabled?: boolean;
};

/** Registry fields the list does not carry (aliases), for the open entry. */
export type EntryDetails = { aliases: string[] };

export type Area = { areaId: string; name: string; icon: string | null };

export type Floor = { floorId: string; name: string; icon: string | null };

export type Label = { labelId: string; name: string; icon: string | null; color: string | null };
