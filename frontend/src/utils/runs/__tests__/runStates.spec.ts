import { describe, expect, it } from "vitest";

import type { Run, RunStep } from "@/services/tracesService";
import type { BlockSection, DisplayBlock, DisplayBranch, DisplayFlow } from "@/types/editor";

import { runStatesFor, tracePathOf } from "../runStates";

const block = (
  id: string,
  section: BlockSection,
  branches: DisplayBranch[] = [],
  isDisabled = false,
): DisplayBlock => ({ id, section, branches, isDisabled }) as DisplayBlock;
const branch = (blocks: DisplayBlock[]): DisplayBranch => ({ label: "", blocks, add: [] });

const step = (
  path: string,
  result: RunStep["result"] = null,
  error: string | null = null,
): RunStep => ({
  path,
  at: "2026-11-21T10:00:00Z",
  result,
  error,
});

const run = (steps: RunStep[], over: Partial<Run> = {}): Run => ({
  runId: "1",
  startedAt: "2026-11-21T10:00:00Z",
  finishedAt: "2026-11-21T10:00:01Z",
  result: "finished",
  lastStep: steps[steps.length - 1]?.path ?? null,
  error: null,
  start: {
    triggerIndex: 0,
    entityId: null,
    from: null,
    to: null,
    description: null,
    by: "trigger",
  },
  steps,
  ...over,
});

const FLOW = {
  triggers: [block("triggers.0", "trigger"), block("triggers.1", "trigger")],
  conditions: [block("conditions.0", "condition"), block("conditions.1", "condition")],
  actions: [
    block("actions.0", "action"),
    block("actions.1", "action", [
      branch([block("actions.1.if.0", "condition")]),
      branch([block("actions.1.then.0", "action")]),
      branch([block("actions.1.else.0", "action")]),
    ]),
    block("actions.2", "action", [], true),
    block("actions.3", "action"),
  ],
} as unknown as DisplayFlow;

describe("tracePathOf", () => {
  it("names the top level like HA and files if-conditions under 'condition'", () => {
    expect(tracePathOf("actions.1.then.0")).toBe("action/1/then/0");
    expect(tracePathOf("actions.1.if.0")).toBe("action/1/if/condition/0");
    expect(tracePathOf("sequence.2")).toBe("sequence/2");
    expect(tracePathOf("triggers.0")).toBe("trigger/0");
  });
});

describe("runStatesFor", () => {
  it("follows a finished run through the branch that was taken", () => {
    const states = runStatesFor(
      run([
        step("trigger/0"),
        step("condition/0", { result: true }),
        step("condition/1", { result: true }),
        step("condition/1/entity_id/0", { result: true, state: "off", wanted_state: "off" }),
        step("action/0", { params: {} }),
        step("action/1", { choice: "else" }),
        step("action/1/if/condition/0", { result: false }),
        step("action/1/else/0", { delay: 900, done: true }),
        step("action/3", { params: {} }),
      ]),
      FLOW,
    );
    const status = (id: string) => states.get(id)?.status;

    expect([status("triggers.0"), status("triggers.1")]).toEqual(["fired", "notFired"]);
    expect(states.get("conditions.1")).toMatchObject({
      status: "passed",
      value: "off",
      wanted: "off",
    });
    expect(status("actions.1.if.0")).toBe("failed");
    expect(status("actions.1.then.0")).toBe("notTaken");
    expect(states.get("actions.1.else.0")).toMatchObject({ status: "done", delaySeconds: 900 });
    expect(status("actions.2")).toBe("disabled");
    expect(status("actions.3")).toBe("done");
  });

  it("marks where a run stopped: a failed condition, an error, a running or interrupted step", () => {
    const failed = runStatesFor(
      run([step("trigger/0"), step("condition/0", { result: false })], {
        result: "conditionsFailed",
      }),
      FLOW,
    );
    expect(failed.get("conditions.0")?.status).toBe("failed");
    expect(failed.get("conditions.1")?.status).toBe("notReached");
    expect(failed.get("actions.0")?.status).toBe("notReached");

    const broken = runStatesFor(
      run([step("trigger/0"), step("action/0", null, "Entity switch.x is unavailable")], {
        result: "error",
      }),
      FLOW,
    );
    expect(broken.get("actions.0")).toMatchObject({
      status: "error",
      error: "Entity switch.x is unavailable",
    });

    const running = runStatesFor(
      run([step("trigger/0"), step("action/0")], { result: "running" }),
      FLOW,
    );
    expect(running.get("actions.0")?.status).toBe("running");

    const cancelled = runStatesFor(
      run([step("trigger/0"), step("action/0")], { result: "cancelled" }),
      FLOW,
    );
    expect(cancelled.get("actions.0")?.status).toBe("interrupted");
  });

  it("reads numeric conditions as a comparison", () => {
    const states = runStatesFor(
      run([
        step("action/1", { choice: "then" }),
        step("action/1/if/condition/0", { result: true }),
        step("action/1/if/condition/0/entity_id/0", {
          result: true,
          state: 14,
          wanted_state_below: 20,
        }),
      ]),
      FLOW,
    );

    expect(states.get("actions.1.if.0")).toMatchObject({ value: "14", wanted: "< 20" });
    expect(states.get("actions.1.else.0")?.status).toBe("notTaken");
  });
});
