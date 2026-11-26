import { type HaTrace, toRun } from "./trace-mapper";

/** A finished run with the given steps and context, as `trace/get` answers it. */
function trace(
  steps: string[],
  context: HaTrace["context"],
  trigger?: Record<string, unknown>,
): HaTrace {
  return {
    run_id: "run-1",
    state: "stopped",
    script_execution: "finished",
    last_step: steps.at(-1) ?? null,
    timestamp: { start: "2026-11-26T10:00:00Z", finish: "2026-11-26T10:00:01Z" },
    context,
    trace: Object.fromEntries(
      steps.map((path, index) => [
        path,
        [
          {
            path,
            timestamp: `2026-11-26T10:00:00.${index}Z`,
            ...(path.startsWith("trigger")
              ? { changed_variables: { trigger: trigger ?? {} } }
              : {}),
          },
        ],
      ]),
    ),
  };
}

describe("toRun start", () => {
  it("knows a trigger of the automation started it", () => {
    const run = toRun(
      trace(
        ["trigger/0", "action/0"],
        { parent_id: "event" },
        { entity_id: "binary_sensor.motion" },
      ),
    );

    expect(run.start).toMatchObject({
      by: "trigger",
      triggerIndex: 0,
      entityId: "binary_sensor.motion",
    });
  });

  it("knows an automation was run by hand, although HA sets a parent context", () => {
    // HA 2026.12.0b1, "Ausführen": step "trigger" without a number, trigger { platform: null }
    const run = toRun(
      trace(
        ["trigger", "action/0"],
        { parent_id: "service-call", user_id: null },
        { platform: null },
      ),
    );

    expect(run.start).toMatchObject({ by: "user", triggerIndex: null, entityId: null });
  });

  it("knows a script was started by another flow or by a user", () => {
    expect(toRun(trace(["sequence/0"], { parent_id: "automation-run" })).start.by).toBe("flow");
    expect(toRun(trace(["sequence/0"], { parent_id: null, user_id: "u1" })).start.by).toBe("user");
    expect(toRun(trace(["sequence/0"], {})).start.by).toBe("unknown");
  });
});
