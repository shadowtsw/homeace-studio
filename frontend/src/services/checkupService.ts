import type { EntryKind } from "@/types/entry";

import { apiFetch, apiPost } from "./api";

export type CheckupKind = "gone" | "unavailable" | "failed" | "unused" | "stale";

export type CheckupRef = { entityId: string; name: string | null; since: string | null };

export type CheckupFinding = {
  key: string;
  kind: CheckupKind;
  entityId: string;
  name: string;
  entryKind: EntryKind;
  refs: CheckupRef[];
  lastTriggered: string | null;
  isOn: boolean;
  /** failed: when the failed run started, and HA's error. */
  failedAt: string | null;
  error: string | null;
};

export type CheckupOverview = {
  findings: CheckupFinding[];
  ignoredCount: number;
  checkedAt: string;
};

export const CHECKUP_KINDS: readonly CheckupKind[] = [
  "gone",
  "unavailable",
  "failed",
  "unused",
  "stale",
];

export function fetchCheckup(): Promise<CheckupOverview> {
  return apiFetch<CheckupOverview>({ path: "/checkup" });
}

export async function ignoreFinding(key: string): Promise<void> {
  await apiPost<null>({ path: "/checkup/ignore", body: { key } });
}

export async function restoreFindings(): Promise<void> {
  await apiFetch<null>({ path: "/checkup/ignore", options: { method: "DELETE" } });
}
