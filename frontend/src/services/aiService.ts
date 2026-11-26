import type { EntryKind } from "@/types/entry";

import { apiFetch, apiPost, apiSend } from "./api";

export type McpConnection = { client: string | null; at: string };

export type McpOverview = {
  isEnabled: boolean;
  token: string | null;
  path: string;
  containerPort: number;
  /**
   * Host port of the MCP endpoint; null while the user has not set one in the app's network
   * options.
   */
  hostPort: number | null;
  isAddon: boolean;
  lastConnection: McpConnection | null;
};

export type AiOperationState = "ok" | "gone" | "done" | "conflict";

export type AiOperation =
  | { id: string; type: "renameFolder"; from: string; to: string; state: AiOperationState }
  | {
      id: string;
      type: "moveEntry";
      entityId: string;
      entryName: string;
      to: string;
      state: AiOperationState;
      currentFolder?: string | null;
      kind?: EntryKind;
    };

export type AiPlanStatus = "open" | "applied" | "partial" | "rejected";

export type AiPlan = {
  id: string;
  title: string;
  reasoning: string;
  client: string | null;
  createdAt: string;
  status: AiPlanStatus;
  operations: AiOperation[];
  appliedOperationIds: string[];
  decidedAt: string | null;
};

export type ApplyResult = { appliedCount: number; failed: { operationId: string }[] };

export function fetchMcp(): Promise<McpOverview> {
  return apiFetch<McpOverview>({ path: "/mcp" });
}

export function setMcpEnabled(isEnabled: boolean): Promise<McpOverview> {
  return apiSend<McpOverview>({ method: "PUT", path: "/mcp", body: { isEnabled } });
}

export function renewMcpToken(): Promise<McpOverview> {
  return apiPost<McpOverview>({ path: "/mcp/token", body: {} });
}

export function fetchAiPlans(): Promise<AiPlan[]> {
  return apiFetch<AiPlan[]>({ path: "/ai-plans" });
}

export type ApplyAiPlanOptions = {
  planId: string;
  operationIds: string[];
};

export function applyAiPlan({ planId, operationIds }: ApplyAiPlanOptions): Promise<ApplyResult> {
  return apiPost<ApplyResult>({
    path: `/ai-plans/${encodeURIComponent(planId)}/apply`,
    body: { operationIds },
  });
}

export async function rejectAiPlan(planId: string): Promise<void> {
  await apiPost<null>({ path: `/ai-plans/${encodeURIComponent(planId)}/reject`, body: {} });
}
