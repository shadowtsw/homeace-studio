import { Logger, NotFoundException } from "@nestjs/common";

import { CategoriesService } from "../categories/categories.service";
import { HaCategoriesRepository } from "../categories/repositories/ha-categories.repository";
import { createDemoHome } from "../demo/demo-home";
import { DemoHaConnectionService, DemoHaRestService } from "../demo/demo-ha.services";
import { FakeHa } from "../demo/fake-ha";
import { MemoryOverlayRepository } from "../demo/memory-overlay.repository";
import { DependenciesService } from "../dependencies/dependencies.service";
import { HaEditorRepository } from "../editor/repositories/ha-editor.repository";
import { EntriesService } from "../entries/entries.service";
import { HaEntriesRepository } from "../entries/repositories/ha-entries.repository";
import { LiveService } from "../live/live.service";
import { HomeSnapshotService } from "../snapshot/home-snapshot.service";
import { ENTITY_MOVE_STATUS } from "./entity-sorting.model";
import { EntitySortingService } from "./entity-sorting.service";
import { HaSortingSourcesRepository } from "./repositories/ha-sorting-sources.repository";

/** The tool over the demo home, through the real services. */
function setup() {
  const fake = new FakeHa(createDemoHome());
  const ha = new DemoHaConnectionService(fake);
  const overlay = new MemoryOverlayRepository({});
  const categories = new CategoriesService(new HaCategoriesRepository(ha), overlay);
  const entries = new EntriesService(new HaEntriesRepository(ha), overlay, categories);
  const editor = new HaEditorRepository(ha, new DemoHaRestService(fake));
  // Each read gets a new moment, so the snapshot never comes from the cache.
  let time = Date.parse("2026-11-26T12:00:00Z");
  const snapshots = new HomeSnapshotService(
    entries,
    ha,
    editor,
    () => (time += 60_000),
    new LiveService(ha),
  );
  const service = new EntitySortingService(
    snapshots,
    new DependenciesService(snapshots),
    categories,
    new HaSortingSourcesRepository(ha),
    overlay,
  );

  return { service, overlay };
}

describe("EntitySortingService", () => {
  beforeAll(() => {
    Logger.overrideLogger(false);
  });

  it("lists plain entities with what the tool needs, and the flows that use them", async () => {
    const { service } = setup();

    const context = await service.context();
    const byId = new Map(context.entities.map((entity) => [entity.entityId, entity]));
    const voltage = byId.get("sensor.kitchen_motion_sensor_voltage");

    expect(byId.has("automation.kitchen_light_on_motion")).toBe(false);
    expect(voltage).toMatchObject({
      isDisabled: true,
      entityCategory: "diagnostic",
      areaId: "kitchen",
    });
    expect(byId.get("sensor.old_meter")).toMatchObject({ isInRegistry: false });
    expect(byId.get("light.terrace")?.categoryPath).toBe("House/Terrace");
    expect(context.integrations.fritz).toBe("AVM FRITZ!Box Tools");
    expect(context.devices.find((device) => device.name === "Kitchen fridge")).toMatchObject({
      areaId: null,
      manufacturer: "Shelly",
    });
    expect(context.areas.find((area) => area.areaId === "kitchen")?.floorId).toBe("ground_floor");
    const cooking = context.flows.find((flow) => flow.name === "Cooking mode");
    expect(cooking?.categoryPath).toBe("House/Kitchen/Cooking");
    expect(cooking?.uses).toContainEqual({ entityId: "switch.coffee_machine", roles: ["action"] });
    expect(context.folders).toEqual(expect.arrayContaining(["House/Kitchen/Lights", "Climate"]));
    expect(context.folderKinds["House/Terrace"]).toEqual(
      expect.arrayContaining(["automation", "entity"]),
    );
  });

  it("applies a run in batches and undoes all of it", async () => {
    const { service } = setup();

    await service.applyMoves("run-1", [
      { entityId: "light.kitchen_ceiling_light", categoryPath: "House/Kitchen" },
      { entityId: "switch.coffee_machine", categoryPath: "House/Kitchen" },
    ]);
    const second = await service.applyMoves("run-1", [
      { entityId: "sensor.old_meter", categoryPath: "House/Kitchen" },
    ]);

    expect(second).toEqual([
      { entityId: "sensor.old_meter", status: ENTITY_MOVE_STATUS.notInRegistry, from: null },
    ]);
    const afterApply = await service.context();
    expect(afterApply.memory.lastRun?.moves.map((move) => move.entityId)).toEqual([
      "light.kitchen_ceiling_light",
      "switch.coffee_machine",
    ]);
    expect(
      afterApply.entities.find((e) => e.entityId === "switch.coffee_machine")?.categoryPath,
    ).toBe("House/Kitchen");

    await service.undo("run-1", ["light.kitchen_ceiling_light", "switch.coffee_machine"]);

    const afterUndo = await service.context();
    expect(afterUndo.memory.lastRun).toBeNull();
    expect(
      afterUndo.entities.find((e) => e.entityId === "switch.coffee_machine")?.categoryPath,
    ).toBeNull();
    expect(afterUndo.folders).not.toContain("House/Kitchen");
  });

  it("leaves an entity alone on undo when its folder changed since the run", async () => {
    const { service } = setup();

    await service.applyMoves("run-1", [
      { entityId: "switch.coffee_machine", categoryPath: "Kitchen" },
    ]);
    await service.applyMoves("run-2", [
      { entityId: "switch.coffee_machine", categoryPath: "Coffee" },
    ]);

    await expect(service.undo("run-1", ["switch.coffee_machine"])).rejects.toBeInstanceOf(
      NotFoundException,
    );
    const results = await service.undo("run-2", ["switch.coffee_machine"]);

    expect(results[0]?.status).toBe(ENTITY_MOVE_STATUS.moved);
    expect(results[0]?.from).toBe("Coffee");
  });

  it("keeps rules, turned-down folders and kept-out bundles, but never lets them drop the last run", async () => {
    const { service } = setup();
    await service.applyMoves("run-1", [
      { entityId: "switch.coffee_machine", categoryPath: "Kitchen" },
    ]);

    await service.saveMemory({
      rules: [{ conditions: [{ type: "label", value: "lights" }], target: "Lights/{area}" }],
      rejected: [{ bundleKey: "entity:sensor.open_windows", paths: ["Security"] }],
      ignored: ["entity:sun.sun"],
      areaParent: "",
    });

    const { memory } = await service.context();
    expect(memory.rules).toHaveLength(1);
    expect(memory.ignored).toEqual(["entity:sun.sun"]);
    expect(memory.areaParent).toBe("");
    expect(memory.lastRun?.runId).toBe("run-1");
  });
});
