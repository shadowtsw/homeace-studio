import { createDemoHome } from "../demo/demo-home";
import { DemoHaConnectionService, DemoHaRestService } from "../demo/demo-ha.services";
import { FakeHa } from "../demo/fake-ha";
import { EditorService } from "../editor/editor.service";
import { HaEditorRepository } from "../editor/repositories/ha-editor.repository";
import { TracesService } from "./traces.service";

/** Runs of the demo home, through the real editor repository. */
function setup() {
  const fake = new FakeHa(createDemoHome(Date.parse("2026-11-21T20:00:00Z")));
  const ha = new DemoHaConnectionService(fake);

  const editor = new HaEditorRepository(ha, new DemoHaRestService(fake));

  return new TracesService(ha, editor, new EditorService(editor));
}

describe("TracesService", () => {
  it("lists the runs of an automation, newest first, with what started them", async () => {
    const history = await setup().forEntity("automation.terrace_light_on_motion");

    expect(history.storedTraces).toBe(5);
    expect(history.runs.map((run) => run.result)).toEqual([
      "running",
      "cancelled",
      "finished",
      "conditionsFailed",
    ]);
    expect(history.runs[0]?.finishedAt).toBeNull();
    expect(history.runs[2]?.start).toEqual({
      triggerIndex: 0,
      entityId: "binary_sensor.terrace_motion",
      from: "off",
      to: "on",
      description: "state of binary_sensor.terrace_motion",
      by: "trigger",
    });
  });

  it("keeps the steps in time order with HA's results and errors", async () => {
    const history = await setup().forEntity("automation.solar_surplus_to_wallbox");
    const failed = history.runs[0];

    expect(failed?.result).toBe("error");
    expect(failed?.error).toBe("Entity switch.wallbox is unavailable");
    expect(failed?.steps.map((step) => step.path)).toEqual([
      "trigger/0",
      "condition/0",
      "condition/0/entity_id/0",
      "action/0",
    ]);
    expect(failed?.steps.at(-1)?.error).toBe("Entity switch.wallbox is unavailable");
  });

  it("finds script runs by the script key and knows a user started them", async () => {
    const history = await setup().forEntity("script.terrace_evening_mood");

    expect(history.runs).toHaveLength(1);
    expect(history.runs[0]?.start.by).toBe("user");
    expect(history.runs[0]?.steps[2]?.result).toEqual({ delay: 2, done: true });
  });

  it("has no runs for other kinds or flows HA kept none of", async () => {
    const service = setup();

    expect((await service.forEntity("input_boolean.guest_mode")).runs).toEqual([]);
    expect((await service.forEntity("automation.washing_machine_done")).runs).toEqual([]);
  });

  it("lets HA keep more runs by writing trace.stored_traces into the config", async () => {
    const service = setup();

    await expect(
      service.keepRuns({ entityId: "automation.terrace_light_on_motion", count: 20 }),
    ).resolves.toEqual({
      storedTraces: 20,
    });
    expect((await service.forEntity("automation.terrace_light_on_motion")).storedTraces).toBe(20);
  });
});
