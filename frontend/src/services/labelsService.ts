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
  return apiPost<Label>({ path: "/labels", body: fields });
}

export type UpdateLabelOptions = {
  labelId: string;
  fields: LabelFields;
};

/** Missing fields stay; null clears colour or icon. Renaming keeps the label's id. */
export function updateLabel({ labelId, fields }: UpdateLabelOptions): Promise<Label> {
  return apiSend<Label>({ method: "PATCH", path: labelPath(labelId), body: fields });
}

/** HA takes the label away from everything that carries it. */
export async function deleteLabel(labelId: string): Promise<void> {
  await apiFetch<null>({ path: labelPath(labelId), options: { method: "DELETE" } });
}

export function fetchLabelUsage(labelId: string): Promise<LabelUsage> {
  return apiFetch<LabelUsage>({ path: `${labelPath(labelId)}/usage` });
}
