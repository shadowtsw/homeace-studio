import { describe, expect, it } from "vitest";

import type { DependencyUse } from "@/services/dependenciesService";

import { countUses, goneHintKey, groupUsesByRole } from "../dependencies";

const use = (entityId: string, roles: DependencyUse["roles"], exists = true): DependencyUse => ({
  entityId,
  name: entityId,
  roles,
  exists,
  alsoUsedBy: [],
});

describe("groupUsesByRole", () => {
  it("groups in display order and repeats entities used in two ways", () => {
    const groups = groupUsesByRole([
      use("light.terrace", ["condition", "action"]),
      use("binary_sensor.motion", ["trigger"]),
      use("input_number.brightness", ["value"]),
    ]);

    expect(groups.map((group) => [group.role, group.uses.map((item) => item.entityId)])).toEqual([
      ["trigger", ["binary_sensor.motion"]],
      ["condition", ["light.terrace"]],
      ["action", ["light.terrace"]],
      ["value", ["input_number.brightness"]],
    ]);
  });
});

describe("countUses", () => {
  it("counts every entity once and the gone ones", () => {
    expect(
      countUses([use("light.a", ["condition", "action"]), use("light.old", ["action"], false)]),
    ).toEqual({ total: 2, gone: 1 });
  });
});

describe("goneHintKey", () => {
  it("sends a scene to its states, everything else to the flow", () => {
    expect(goneHintKey("scene")).toBe("deps.goneHintScene");
    expect(goneHintKey("automation")).toBe("deps.goneHint");
    expect(goneHintKey("script")).toBe("deps.goneHint");
  });
});
