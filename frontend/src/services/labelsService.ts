import type { Label } from "@/types/entry";

import { apiFetch, apiPost, apiSend } from "./api";

export type LabelFields = { name?: string; color?: string | null; icon?: string | null };

/** What deleting a label would touch (`GET /api/labels/:id/usage`). */
export type LabelUsage = {
  entries: number;
  entities: number;
  devices: number;
  areas: number;
  /** Flows that use the label as a target; they would do less without it. */
  flowsAsTarget: { entityId: string; name: string }[];
};

const labelPath = (labelId: string): string => `/labels/${encodeURIComponent(labelId)}`;

export function createLabel(fields: LabelFields & { name: string }): Promise<Label> {
  return apiPost<Label>("/labels", fields);
}

/** Missing fields stay; null clears colour or icon. Renaming keeps the label's id. */
export function updateLabel(labelId: string, fields: LabelFields): Promise<Label> {
  return apiSend<Label>("PATCH", labelPath(labelId), fields);
}

/** HA takes the label away from everything that carries it. */
export async function deleteLabel(labelId: string): Promise<void> {
  await apiFetch<null>(labelPath(labelId), { method: "DELETE" });
}

export function fetchLabelUsage(labelId: string): Promise<LabelUsage> {
  return apiFetch<LabelUsage>(`${labelPath(labelId)}/usage`);
}
