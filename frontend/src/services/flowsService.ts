import type { FlowKind } from "@/types/editor";

import { apiFetch, apiPost } from "./api";

/** What the name dialog creates: an automation, a script or a scene. */
export type NamedKind = FlowKind | "scene";

export type NewFlow = {
  kind: NamedKind;
  name: string;
  /** Folder to sort the new flow into right away; null for none. */
  categoryPath: string | null;
};

/** Creates an empty automation, script or scene in HA. @returns Its entity ID. */
export async function createFlow(flow: NewFlow): Promise<string> {
  const { kind, name, categoryPath } = flow;
  const result =
    kind === "scene"
      ? await apiPost<{ entityId: string }>("/scenes", { name, categoryPath })
      : await apiPost<{ entityId: string }>("/flows", flow);

  return result.entityId;
}

/** Deletes an automation or script from automations.yaml / scripts.yaml. */
export async function deleteFlow(entityId: string): Promise<void> {
  await apiFetch<null>(`/flows/${encodeURIComponent(entityId)}`, { method: "DELETE" });
}
