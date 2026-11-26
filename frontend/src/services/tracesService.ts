import { apiFetch, apiSend } from "./api";

/** How a run ended (backend: traces.model.ts). */
export type RunResult =
  | "finished"
  | "conditionsFailed"
  | "error"
  | "running"
  | "cancelled"
  | "ignored"
  | "stopped"
  | "unknown";

/** One step HA recorded; `path` like "action/1/then/0", `result` as HA sends it. */
export type RunStep = {
  path: string;
  at: string;
  result: Record<string, unknown> | null;
  error: string | null;
};

export type RunStart = {
  triggerIndex: number | null;
  entityId: string | null;
  from: string | null;
  to: string | null;
  description: string | null;
  by: "trigger" | "user" | "flow" | "unknown";
};

export type Run = {
  runId: string;
  startedAt: string;
  finishedAt: string | null;
  result: RunResult;
  lastStep: string | null;
  error: string | null;
  start: RunStart;
  steps: RunStep[];
};

export type RunHistory = { entityId: string; storedTraces: number; runs: Run[] };

export type KeepRunsOptions = {
  entityId: string;
  count: number;
};

/** Writes `trace.stored_traces` into the flow's config; HA keeps that many runs from now on. */
export async function keepRuns({ entityId, count }: KeepRunsOptions): Promise<void> {
  await apiSend<{ storedTraces: number }>({
    method: "PUT",
    path: `/traces/${encodeURIComponent(entityId)}/stored`,
    body: {
      count,
    },
  });
}

export function fetchRunHistory(entityId: string): Promise<RunHistory> {
  return apiFetch<RunHistory>({ path: `/traces/${encodeURIComponent(entityId)}` });
}
