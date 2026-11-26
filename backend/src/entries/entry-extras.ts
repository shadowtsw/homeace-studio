import type { Overlay } from "../overlay/overlay.model";
import type { Entry } from "./entry.model";

export type WithExtrasOptions = {
  entries: readonly Entry[];
  overlay: Overlay;
};

/**
 * Adds the user's own extras (favorite, note) from the overlay to entries from HA.
 *
 * @returns New entry objects; entries without extras get `isFavorite: false` and `note: null`.
 */
export function withExtras({ entries, overlay }: WithExtrasOptions): Entry[] {
  const favorites = new Set(overlay.favorites);

  return entries.map((entry) => ({
    ...entry,
    isFavorite: favorites.has(entry.entityId),
    note: overlay.notes[entry.entityId] ?? null,
  }));
}

export type ApplyExtrasOptions = {
  overlay: Overlay;
  entityId: string;
  /**
   * `isFavorite` sets or clears the favorite; `note` null or blank removes the note. Missing fields
   * stay as they are.
   */
  extras: { isFavorite?: boolean; note?: string | null };
};

/**
 * Applies a change of favorite and note for one entity to the overlay.
 */
export function applyExtras({ overlay, entityId, extras }: ApplyExtrasOptions): Overlay {
  const favorites = overlay.favorites.filter((id) => id !== entityId);
  const notes = { ...overlay.notes };

  if (extras.isFavorite ?? overlay.favorites.includes(entityId)) {
    favorites.push(entityId);
  }

  if (extras.note !== undefined) {
    const note = extras.note?.trim();

    if (note) {
      notes[entityId] = note;
    } else {
      delete notes[entityId];
    }
  }

  return { ...overlay, favorites, notes };
}

export type RemoveExtrasOptions = {
  overlay: Overlay;
  entityId: string;
};

/** Removes all extras of an entity, e.g. after it was deleted in HA. */
export function removeExtras({ overlay, entityId }: RemoveExtrasOptions): Overlay {
  return applyExtras({ overlay, entityId, extras: { isFavorite: false, note: null } });
}
