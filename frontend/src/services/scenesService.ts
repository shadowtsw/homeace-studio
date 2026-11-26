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

export type SceneView = {
  entityId: string;
  isEditable: boolean;
  devices: SceneDevice[];
  /** The unit HA shows temperatures in ("°C" or "°F"). */
  temperatureUnit: string;
};

const scenePath = (entityId: string): string => `/scenes/${encodeURIComponent(entityId)}`;

export function fetchScene(entityId: string): Promise<SceneView> {
  return apiFetch<SceneView>({ path: scenePath(entityId) });
}

/** A device as it would join a scene, with its current state as the starting values. */
export function fetchSceneDevice(deviceId: string): Promise<SceneDevice> {
  return apiFetch<SceneDevice>({ path: `/scenes/device/${encodeURIComponent(deviceId)}` });
}

export type SaveSceneOptions = {
  entityId: string;
  entities: Record<string, SceneValue>;
};

export function saveScene({ entityId, entities }: SaveSceneOptions): Promise<SceneView> {
  return apiSend<SceneView>({ method: "PUT", path: scenePath(entityId), body: { entities } });
}

export type PreviewSceneOptions = {
  entityId: string;
  entities: Record<string, SceneValue>;
};

/** Shows the values on the devices now; the backend keeps their previous states. */
export async function previewScene({ entityId, entities }: PreviewSceneOptions): Promise<void> {
  await apiPost<null>({ path: `${scenePath(entityId)}/preview`, body: { entities } });
}

export type RestoreSceneOptions = {
  entityId: string;
  entityIds?: string[];
};

/** Brings the given devices (or all previewed ones) back to how they were. */
export async function restoreScene({ entityId, entityIds }: RestoreSceneOptions): Promise<void> {
  await apiPost<null>({ path: `${scenePath(entityId)}/restore`, body: { entityIds } });
}

/** Restore while the page goes away: sendBeacon still arrives when a fetch would be cancelled. */
export function restoreSceneOnLeave(entityId: string): void {
  const body = new Blob([JSON.stringify({})], { type: "application/json" });
  navigator.sendBeacon(`${API_BASE_URL}${scenePath(entityId)}/restore`, body);
}
