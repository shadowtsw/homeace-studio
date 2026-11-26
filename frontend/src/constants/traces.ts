import type { RunResult } from "@/services/tracesService";

/** How many runs HA keeps for an automation or script when its config says nothing. */
export const DEFAULT_STORED_TRACES = 5;

/** The choices under Einstellungen → Bearbeiten; 50 is the backend's limit. */
export const STORED_TRACES_CHOICES = [DEFAULT_STORED_TRACES, 10, 20, 50] as const;

/** "Die letzten 20 merken" in the run history. */
export const KEEP_MORE_RUNS = 20;

/** The icon of a run result in the run history. */
export const RUN_RESULT_ICON: Record<RunResult, string> = {
  finished: "mdi-check",
  conditionsFailed: "mdi-cancel",
  error: "mdi-alert-circle-outline",
  running: "mdi-timer-sand",
  cancelled: "mdi-restart",
  ignored: "mdi-minus-circle-outline",
  stopped: "mdi-stop-circle-outline",
  unknown: "mdi-help-circle-outline",
};

/** The color of a run result: ok, warn, err, run or none (CSS modifiers). */
export const RUN_RESULT_TONE: Record<RunResult, string> = {
  finished: "ok",
  conditionsFailed: "warn",
  error: "err",
  running: "run",
  cancelled: "none",
  ignored: "none",
  stopped: "none",
  unknown: "none",
};

/** Results that need a sentence of explanation. */
export const RUN_RESULT_HINT: Partial<Record<RunResult, true>> = { cancelled: true, ignored: true };
