import type { EntryAction } from "@/constants/entries";
import type { Entry, EntryChanges, EntryDetails } from "@/types/entry";

import { apiFetch, apiPost, apiSend } from "./api";

/** URL path segment per action (POST /api/entries/:id/<segment>). */
const ACTION_PATH: Record<EntryAction, string> = {
  run: "run",
  turnOn: "turn-on",
  turnOff: "turn-off",
};

const entryPath = (entityId: string): string => `/entries/${encodeURIComponent(entityId)}`;

/** All automations, scripts, scenes and helpers, sorted by name. */
export function fetchEntries(): Promise<Entry[]> {
  return apiFetch<Entry[]>({ path: "/entries" });
}

export type MoveEntryOptions = {
  entityId: string;
  /** Target folder like "Haus/Pool"; null takes the entry out of every category. */
  categoryPath: string | null;
};

/**
 * Moves an entry into a folder. HA categories are created and cleaned up by the backend.
 */
export async function moveEntry({ entityId, categoryPath }: MoveEntryOptions): Promise<void> {
  await apiPost<null>({ path: `${entryPath(entityId)}/move`, body: { categoryPath } });
}

export type DuplicateEntryOptions = {
  entityId: string;
  name: string;
};

/** Copies an automation or script with folder, labels and area. @returns The new entity ID. */
export async function duplicateEntry({ entityId, name }: DuplicateEntryOptions): Promise<string> {
  const result = await apiPost<{ entityId: string }>({
    path: `${entryPath(entityId)}/duplicate`,
    body: { name },
  });
  return result.entityId;
}

/** Aliases: HA sends them only for one entry at a time. */
export function fetchEntryDetails(entityId: string): Promise<EntryDetails> {
  return apiFetch<EntryDetails>({ path: `${entryPath(entityId)}/details` });
}

export type UpdateEntryOptions = {
  entityId: string;
  changes: EntryChanges;
};

/**
 * Changes name, icon, area, labels, aliases, hidden or disabled in HA. @returns The entry as HA now
 * has it.
 */
export function updateEntry({ entityId, changes }: UpdateEntryOptions): Promise<Entry> {
  return apiSend<Entry>({ method: "PATCH", path: entryPath(entityId), body: changes });
}

export type RunEntryActionOptions = {
  entityId: string;
  action: EntryAction;
};

/** Runs, switches on or switches off an entry in HA. */
export async function runEntryAction({ entityId, action }: RunEntryActionOptions): Promise<void> {
  await apiPost<null>({ path: `${entryPath(entityId)}/${ACTION_PATH[action]}` });
}

export type UpdateEntryExtrasOptions = {
  entityId: string;
  extras: { isFavorite?: boolean; note?: string | null };
};

/** Saves favorite and note (only in HomeAce Studio). */
export async function updateEntryExtras({
  entityId,
  extras,
}: UpdateEntryExtrasOptions): Promise<void> {
  await apiSend<null>({ method: "PATCH", path: `${entryPath(entityId)}/extras`, body: extras });
}
