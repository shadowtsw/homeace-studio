import type { EntitySortingMemory } from "./entity-sorting.model";
import { addToRun, moveSortingPaths, renameSortingEntity } from "./sorting-memory";

const MEMORY: EntitySortingMemory = {
  rules: [
    { conditions: [{ type: "label", value: "lights" }], target: "Haus/{area}" },
    { conditions: [{ type: "domain", value: "update" }], target: "Hausflur" },
  ],
  rejected: [{ bundleKey: "entity:sensor.x", paths: ["Haus/Küche", "Klima"] }],
  ignored: ["entity:sensor.x", "dev1"],
  areaParent: "Haus",
  lastRun: {
    runId: "r",
    at: "2026-11-26T10:00:00Z",
    moves: [{ entityId: "sensor.x", from: null, to: "Haus/Küche" }],
  },
};

const haus = (path: string): string =>
  path === "Haus" || path.startsWith("Haus/") ? `Heim${path.slice("Haus".length)}` : path;

describe("moveSortingPaths", () => {
  it("moves rule targets, turned-down folders and the last run along, on whole levels", () => {
    const moved = moveSortingPaths({ memory: MEMORY, movePath: haus });

    expect(moved.rules.map((rule) => rule.target)).toEqual(["Heim/{area}", "Hausflur"]);
    expect(moved.rejected[0]?.paths).toEqual(["Heim/Küche", "Klima"]);
    expect(moved.areaParent).toBe("Heim");
    expect(moved.lastRun?.moves[0]).toEqual({ entityId: "sensor.x", from: null, to: "Heim/Küche" });
  });
});

describe("renameSortingEntity", () => {
  it("carries the bundle key of an entity without a device and its last move", () => {
    const renamed = renameSortingEntity({ memory: MEMORY, from: "sensor.x", to: "sensor.y" });

    expect(renamed.ignored).toEqual(["entity:sensor.y", "dev1"]);
    expect(renamed.rejected[0]?.bundleKey).toBe("entity:sensor.y");
    expect(renamed.lastRun?.moves[0]?.entityId).toBe("sensor.y");
  });
});

describe("addToRun", () => {
  const move = (entityId: string) => ({ entityId, from: null, to: "Haus" });

  it("starts a new run when the run id differs or there is none", () => {
    const at = "2026-11-27T12:00:00Z";

    expect(
      addToRun({ lastRun: MEMORY.lastRun, runId: "r2", moves: [move("light.a")], at }),
    ).toEqual({ runId: "r2", at, moves: [move("light.a")] });
    expect(addToRun({ lastRun: null, runId: "r2", moves: [], at })).toEqual({
      runId: "r2",
      at,
      moves: [],
    });
  });

  it("adds the moves of a later batch to the same run and keeps its start time", () => {
    const continued = addToRun({
      lastRun: MEMORY.lastRun,
      runId: "r",
      moves: [move("light.a")],
      at: "2026-11-27T12:00:00Z",
    });

    expect(continued.at).toBe("2026-11-26T10:00:00Z");
    expect(continued.moves.map((item) => item.entityId)).toEqual(["sensor.x", "light.a"]);
  });
});
