import type { Run, RunStep } from "@/services/tracesService";
import type { DisplayBlock, DisplayFlow } from "@/types/editor";

/** What a block did in one run. */
export type BlockRunStatus =
  | "fired"
  | "notFired"
  | "passed"
  | "failed"
  | "done"
  | "error"
  | "running"
  | "interrupted"
  | "notReached"
  | "notTaken"
  | "disabled";

export type BlockRunState = {
  status: BlockRunStatus;
  /** HA's error text. */
  error: string | null;
  /** Conditions: the value HA found, and what it wanted ("off"; "< 20"). */
  value: string | null;
  wanted: string | null;
  /** Delays: how long it waited, in seconds. */
  delaySeconds: number | null;
  /** If and choose: the branch HA took ("then", "else", "default" or the option index). */
  choice: string | number | null;
};

/** The first key of a flow config ("actions") as HA's trace paths name it ("action"). */
const TOP_LEVEL: Record<string, string> = {
  triggers: "trigger",
  trigger: "trigger",
  conditions: "condition",
  condition: "condition",
  actions: "action",
  action: "action",
};

/**
 * HA's trace path of a block, from its id (its config path).
 *
 * @example tracePathOf("actions.1.then.0") // "action/1/then/0"
 * @example tracePathOf("actions.1.if.0") // "action/1/if/condition/0" (HA files if-conditions there)
 */
export function tracePathOf(blockId: string): string {
  const [first = "", ...rest] = blockId.split(".");
  const segments = [TOP_LEVEL[first] ?? first];

  rest.forEach((segment, index) => {
    segments.push(segment);
    if (segment === "if" && /^\d+$/.test(rest[index + 1] ?? "")) segments.push("condition");
  });

  return segments.join("/");
}

/** Whether a branch of a reached block was taken, from HA's `choice` ("then", "else", 2, "default"). */
function isBranchTaken(branchKey: string, choice: unknown): boolean {
  if (branchKey === "then" || branchKey === "else" || branchKey === "default") {
    return choice === branchKey;
  }
  const option = /^choose\.(\d+)$/.exec(branchKey);
  if (option) return choice === Number(option[1]);

  // if-conditions, repeat, sequence, parallel, wait: no choice, always part of the run.
  return true;
}

const stateText = (value: unknown): string | null =>
  value === undefined || value === null ? null : String(value);

/** "< 20", "> 1500" or HA's wanted state. */
function wantedText(result: Record<string, unknown>): string | null {
  if (result.wanted_state !== undefined) return stateText(result.wanted_state);
  if (result.wanted_state_below !== undefined) return `< ${String(result.wanted_state_below)}`;
  if (result.wanted_state_above !== undefined) return `> ${String(result.wanted_state_above)}`;
  return null;
}

/**
 * What every block of a flow did in a run, keyed by block id. Blocks without a recorded step were
 * not reached, sit in a branch that was not taken, or are disabled.
 */
export function runStatesFor(run: Run, flow: DisplayFlow): Map<string, BlockRunState> {
  const byPath = new Map<string, RunStep[]>();
  for (const step of run.steps) byPath.set(step.path, [...(byPath.get(step.path) ?? []), step]);

  const states = new Map<string, BlockRunState>();
  const blank = { error: null, value: null, wanted: null, delaySeconds: null, choice: null };

  const detailOf = (path: string): Pick<BlockRunState, "value" | "wanted"> => {
    // Conditions record what they compared one level deeper, e.g. "condition/1/entity_id/0".
    const inner = run.steps.find(
      (step) => step.path.startsWith(`${path}/`) && step.result && "state" in step.result,
    );
    return inner?.result
      ? { value: stateText(inner.result.state), wanted: wantedText(inner.result) }
      : { value: null, wanted: null };
  };

  const stateOf = (block: DisplayBlock, isSkipped: boolean): BlockRunState => {
    const path = tracePathOf(block.id);
    const steps = byPath.get(path);

    if (block.section === "trigger" && /^trigger\/\d+$/.test(path)) {
      return { ...blank, status: steps ? "fired" : "notFired" };
    }
    if (!steps) {
      if (block.isDisabled) return { ...blank, status: "disabled" };
      return { ...blank, status: isSkipped ? "notTaken" : "notReached" };
    }

    const last = steps[steps.length - 1];
    const result = last?.result ?? null;

    if (last?.error) return { ...blank, status: "error", error: last.error };
    if (run.lastStep === path && run.result === "running") return { ...blank, status: "running" };
    if (run.lastStep === path && run.result === "cancelled") {
      return { ...blank, status: "interrupted" };
    }
    if (result && typeof result.result === "boolean") {
      return { ...blank, ...detailOf(path), status: result.result ? "passed" : "failed" };
    }

    const delay = typeof result?.delay === "number" ? result.delay : null;
    const choice =
      typeof result?.choice === "string" || typeof result?.choice === "number"
        ? result.choice
        : null;
    return { ...blank, status: "done", delaySeconds: delay, choice };
  };

  const walk = (blocks: DisplayBlock[], isSkipped: boolean): void => {
    for (const block of blocks) {
      const state = stateOf(block, isSkipped);
      states.set(block.id, state);

      const blockSteps = byPath.get(tracePathOf(block.id));
      const step = blockSteps?.[blockSteps.length - 1];
      for (const branch of block.branches) {
        const firstId = branch.blocks[0]?.id;
        if (!firstId) continue;

        // "then.0" → "then"; "choose.1.conditions.0" → "choose.1".
        const parts = firstId.slice(block.id.length + 1).split(".");
        const key = parts[0] === "choose" ? parts.slice(0, 2).join(".") : (parts[0] ?? "");
        const isTaken = step !== undefined && isBranchTaken(key, step.result?.choice);
        walk(branch.blocks, isSkipped || (step !== undefined && !isTaken));
      }
    }
  };

  walk(flow.triggers, false);
  walk(flow.conditions, false);
  walk(flow.actions, false);

  return states;
}

/** How long a run took, in seconds; null while it runs. */
export function runSeconds(run: Run): number | null {
  if (!run.finishedAt) return null;
  return (Date.parse(run.finishedAt) - Date.parse(run.startedAt)) / 1000;
}
