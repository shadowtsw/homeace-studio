import type { Area } from "@/types/entry";

import { apiFetch, apiPost, apiSend } from "./api";

export type CreateAreaOptions = {
  name: string;
  icon: string | null;
};

/** @param icon - "mdi:sofa", or null for none. */
export function createArea({ name, icon }: CreateAreaOptions): Promise<Area> {
  return apiPost<Area>({ path: "/areas", body: { name, icon } });
}

export type UpdateAreaOptions = {
  areaId: string;
  changes: { name?: string; icon?: string | null };
};

export function updateArea({ areaId, changes }: UpdateAreaOptions): Promise<Area> {
  return apiSend<Area>({
    method: "PATCH",
    path: `/areas/${encodeURIComponent(areaId)}`,
    body: changes,
  });
}

/** Devices and entries in the area keep existing, without an area. */
export async function deleteArea(areaId: string): Promise<void> {
  await apiFetch<null>({
    path: `/areas/${encodeURIComponent(areaId)}`,
    options: { method: "DELETE" },
  });
}
