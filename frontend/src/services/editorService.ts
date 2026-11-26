import type { EditorCatalog, EntityOption, Flow } from "@/types/editor";

import { apiFetch, apiPost, apiSend } from "./api";

/** All trigger, condition and action types with names in this language. */
export function fetchCatalog(language: string): Promise<EditorCatalog> {
  return apiFetch<EditorCatalog>({ path: `/editor/catalog?lang=${encodeURIComponent(language)}` });
}

/** The stored config of an automation or script, with names of its entities. */
export function fetchFlow(entityId: string): Promise<Flow> {
  return apiFetch<Flow>({ path: `/editor/flows/${encodeURIComponent(entityId)}` });
}

export type SaveFlowOptions = {
  entityId: string;
  config: Record<string, unknown>;
};

/** Writes the whole config back to HA; returns the flow as saved. */
export function saveFlow({ entityId, config }: SaveFlowOptions): Promise<Flow> {
  return apiSend<Flow>({
    method: "PUT",
    path: `/editor/flows/${encodeURIComponent(entityId)}`,
    body: { config },
  });
}

/** Every entity HA has, for the entity picker and the entities in the list. */
export function fetchEntities(): Promise<EntityOption[]> {
  return apiFetch<EntityOption[]>({ path: "/entities" });
}

export type MoveEntityToFolderOptions = {
  entityId: string;
  categoryPath: string | null;
};

/** Puts a plain entity into a folder; null takes it out. */
export async function moveEntityToFolder({
  entityId,
  categoryPath,
}: MoveEntityToFolderOptions): Promise<void> {
  await apiPost<null>({
    path: `/entities/${encodeURIComponent(entityId)}/move`,
    body: { categoryPath },
  });
}
