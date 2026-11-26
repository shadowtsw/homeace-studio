import type { EntitySortingMemory } from "./entity-sorting.model";
import { moveSortingPaths, renameSortingEntity } from "./sorting-memory";

const MEMORY: EntitySortingMemory = {
  rules: [
    { conditions: [{ type: "label", value: "lights" }], target: "Haus/{area}" },
    { conditions: [{ type: "domain", value: "update" }], target: "Hausflur" },
  ],
  rejected: [{ bundleKey: "entity:sensor.x", paths: ["Haus/Küche", "Klima"] }],
  ignored: ["entity:sensor.x", "dev1"],
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
    const moved = moveSortingPaths(MEMORY, haus);

    expect(moved.rules.map((rule) => rule.target)).toEqual(["Heim/{area}", "Hausflur"]);
    expect(moved.rejected[0]?.paths).toEqual(["Heim/Küche", "Klima"]);
    expect(moved.lastRun?.moves[0]).toEqual({ entityId: "sensor.x", from: null, to: "Heim/Küche" });
  });
});

describe("renameSortingEntity", () => {
  it("carries the bundle key of an entity without a device and its last move", () => {
    const renamed = renameSortingEntity(MEMORY, "sensor.x", "sensor.y");

    expect(renamed.ignored).toEqual(["entity:sensor.y", "dev1"]);
    expect(renamed.rejected[0]?.bundleKey).toBe("entity:sensor.y");
    expect(renamed.lastRun?.moves[0]?.entityId).toBe("sensor.y");
  });
});
