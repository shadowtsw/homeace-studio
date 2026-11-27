import type { EntityRename, VersionHistory, VersionRef } from "../versions.model";

/** Where an entry's history lives: kind and storage key, never the entity ID. */
export type HistoryKey = Pick<VersionRef, "kind" | "key">;

export type UpdateHistoryOptions = {
  ref: VersionRef;
  /** Gets the stored history (or an empty one) and returns the history to keep. */
  change: (history: VersionHistory) => VersionHistory;
};

/** Keeps the versions of every entry and the list of renamed entity IDs. */
export interface VersionsRepository {
  /** The history of an entry, or null when HomeAce Studio has none yet. */
  read(key: HistoryKey): Promise<VersionHistory | null>;
  /** Changes one entry's history; changes of the same entry run one after another. */
  update(options: UpdateHistoryOptions): Promise<VersionHistory>;
  readRenames(): Promise<EntityRename[]>;
  addRename(rename: EntityRename): Promise<void>;
  /** When HomeAce Studio last compared all stored configs (ISO 8601), or null before the first time. */
  readLastSeen(): Promise<string | null>;
  writeLastSeen(at: string): Promise<void>;
}

/** A new, empty history for an entry. */
export function emptyHistory(ref: VersionRef): VersionHistory {
  return { ref, versions: [] };
}
