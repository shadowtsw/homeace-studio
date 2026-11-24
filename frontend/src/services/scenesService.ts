import type { SceneValue } from "@/utils/sceneValues";

import { API_BASE_URL, apiFetch, apiPost, apiSend } from "./api";

/** One device of a scene: what the scene sets and what the device does right now. */
export type SceneDevice = {
  entityId: string;
  name: string;
  domain: string;
  /** null for scenes HomeAce Studio cannot read (not in scenes.yaml). */
  values: SceneValue | null;
  current: { state: string; attributes: Record<string, unknown> } | null;
};

export type SceneView = { entityId: string; isEditable: boolean; devices: SceneDevice[] };

const scenePath = (entityId: string): string => `/scenes/${encodeURIComponent(entityId)}`;

export function fetchScene(entityId: string): Promise<SceneView> {
  return apiFetch<SceneView>(scenePath(entityId));
}

/** A device as it would join a scene, with its current state as the starting values. */
export function fetchSceneDevice(deviceId: string): Promise<SceneDevice> {
  return apiFetch<SceneDevice>(`/scenes/device/${encodeURIComponent(deviceId)}`);
}

export function saveScene(
  entityId: string,
  entities: Record<string, SceneValue>,
): Promise<SceneView> {
  return apiSend<SceneView>("PUT", scenePath(entityId), { entities });
}

/** Shows the values on the devices now; the backend keeps their previous states. */
export async function previewScene(
  entityId: string,
  entities: Record<string, SceneValue>,
): Promise<void> {
  await apiPost<null>(`${scenePath(entityId)}/preview`, { entities });
}

/** Brings the given devices (or all previewed ones) back to how they were. */
export async function restoreScene(entityId: string, entityIds?: string[]): Promise<void> {
  await apiPost<null>(`${scenePath(entityId)}/restore`, { entityIds });
}

/** Restore while the page goes away: sendBeacon still arrives when a fetch would be cancelled. */
export function restoreSceneOnLeave(entityId: string): void {
  const body = new Blob([JSON.stringify({})], { type: "application/json" });
  navigator.sendBeacon(`${API_BASE_URL}${scenePath(entityId)}/restore`, body);
}
