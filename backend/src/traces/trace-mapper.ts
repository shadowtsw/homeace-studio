import { isRecord } from "../common/utils/record";
import { RUN_RESULT, type Run, type RunResult, type RunStart, type RunStep } from "./traces.model";

/**
 * A run as HA's `trace/get` answers it (only the fields we read); trace/list leaves out `trace`.
 */
export type HaTrace = {
  run_id: string;
  state: string;
  script_execution: string | null;
  last_step: string | null;
  timestamp: { start: string; finish: string | null };
  trigger?: string;
  error?: string;
  context?: { parent_id?: string | null; user_id?: string | null };
  trace?: Record<string, HaTraceStep[]>;
};

type HaTraceStep = {
  path: string;
  timestamp: string;
  result?: Record<string, unknown>;
  changed_variables?: Record<string, unknown>;
  error?: string;
};

const EXECUTION_RESULT: Record<string, RunResult> = {
  finished: RUN_RESULT.finished,
  failed_conditions: RUN_RESULT.conditionsFailed,
  failed_single: RUN_RESULT.ignored,
  failed_max_runs: RUN_RESULT.ignored,
  error: RUN_RESULT.error,
  cancelled: RUN_RESULT.cancelled,
  aborted: RUN_RESULT.stopped,
  finished_stopped: RUN_RESULT.stopped,
};

const TRIGGER_PATH = /^trigger\/(\d+)$/;
/**
 * The step of a run started with "Ausführen" (`automation.trigger`): HA records it without a trigger
 * number. HA calls such a run "manually triggered", also when an action called `automation.trigger`.
 */
const MANUAL_TRIGGER_PATH = "trigger";

const record = (value: unknown): Record<string, unknown> | null => (isRecord(value) ? value : null);
const text = (value: unknown): string | null => (typeof value === "string" ? value : null);

function resultOf(trace: HaTrace): RunResult {
  if (trace.state === "running") return RUN_RESULT.running;
  return EXECUTION_RESULT[trace.script_execution ?? ""] ?? RUN_RESULT.unknown;
}

function startOf({ trace, steps }: { trace: HaTrace; steps: HaTraceStep[] }): RunStart {
  const triggerStep = steps.find((step) => TRIGGER_PATH.test(step.path));
  const trigger = record(record(triggerStep?.changed_variables)?.trigger);

  if (triggerStep && trigger) {
    return {
      triggerIndex: Number(TRIGGER_PATH.exec(triggerStep.path)?.[1]),
      entityId: text(trigger.entity_id),
      from: text(record(trigger.from_state)?.state),
      to: text(record(trigger.to_state)?.state),
      description: text(trigger.description) ?? trace.trigger ?? null,
      by: "trigger",
    };
  }

  return {
    triggerIndex: null,
    entityId: null,
    from: null,
    to: null,
    description: trace.trigger ?? null,
    by: startedBy({ trace, steps }),
  };
}

/**
 * Who started a run that no trigger of its own started. An automation run by hand still carries a
 * `parent_id` (the context of the service call), so its manual trigger step is checked first.
 */
function startedBy({ trace, steps }: { trace: HaTrace; steps: HaTraceStep[] }): RunStart["by"] {
  if (steps.some((step) => step.path === MANUAL_TRIGGER_PATH)) return "user";
  if (trace.context?.parent_id) return "flow";

  return trace.context?.user_id ? "user" : "unknown";
}

/** HA's trace in our shape: a result word, what started it, and the steps in time order. */
export function toRun(trace: HaTrace): Run {
  const steps = Object.values(trace.trace ?? {})
    .flat()
    .sort((a, b) => a.timestamp.localeCompare(b.timestamp));

  return {
    runId: trace.run_id,
    startedAt: trace.timestamp.start,
    finishedAt: trace.timestamp.finish,
    result: resultOf(trace),
    lastStep: trace.last_step,
    error: trace.error ?? null,
    start: startOf({ trace, steps }),
    steps: steps.map((step): RunStep => ({
      path: step.path,
      at: step.timestamp,
      result: step.result ?? null,
      error: step.error ?? null,
    })),
  };
}
