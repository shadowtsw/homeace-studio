import type { HaEntityRegistryEntry, HaState } from "../ha/ha.types";
import { buildDependencyIndex, collectRoleRefs, type DependencyRole } from "./dependency-analysis";

const known = (...ids: string[]) => {
  const set = new Set(ids);
  return (id: string) => set.has(id);
};
const roles = (refs: Map<string, Set<DependencyRole>>) =>
  Object.fromEntries([...refs].map(([id, set]) => [id, [...set].sort()]));

describe("collectRoleRefs", () => {
  it("tells triggers, conditions, actions and calls apart", () => {
    const refs = collectRoleRefs({
      config: {
        triggers: [{ trigger: "state", entity_id: "binary_sensor.motion", to: "on" }],
        conditions: [{ condition: "state", entity_id: "light.terrace", state: "off" }],
        actions: [
          { action: "light.turn_on", target: { entity_id: ["light.terrace", "light.path"] } },
          { action: "scene.turn_on", target: { entity_id: "scene.cozy" } },
          { action: "script.good_night" },
          { action: "script.turn_on", target: { entity_id: "script.all_off" } },
        ],
      },
      isKnown: known(),
    });

    expect(roles(refs)).toEqual({
      "binary_sensor.motion": ["trigger"],
      "light.terrace": ["action", "condition"],
      "light.path": ["action"],
      "scene.cozy": ["call"],
      "script.good_night": ["call"],
      "script.all_off": ["call"],
    });
  });

  it("counts what if, choose, repeat and wait check as conditions", () => {
    const refs = collectRoleRefs({
      config: {
        sequence: [
          { condition: "state", entity_id: "input_boolean.guest", state: "off" },
          {
            if: [{ condition: "numeric_state", entity_id: "sensor.moisture", below: 20 }],
            then: [{ action: "valve.open_valve", target: { entity_id: "valve.lawn" } }],
          },
          {
            choose: [
              {
                conditions: [{ condition: "state", entity_id: "sun.sun", state: "below_horizon" }],
                sequence: [{ action: "light.turn_on", entity_id: "light.porch" }],
              },
            ],
          },
          { wait_for_trigger: [{ trigger: "state", entity_id: "binary_sensor.door" }] },
        ],
      },
      isKnown: known(),
    });

    expect(roles(refs)).toEqual({
      "input_boolean.guest": ["condition"],
      "sensor.moisture": ["condition"],
      "valve.lawn": ["action"],
      "sun.sun": ["condition"],
      "light.porch": ["action"],
      "binary_sensor.door": ["condition"],
    });
  });

  it("reads known entities from templates as values, and skips words that only look like IDs", () => {
    const refs = collectRoleRefs({
      config: {
        actions: [
          {
            action: "light.turn_on",
            target: { entity_id: "light.terrace" },
            data: { brightness_pct: "{{ states('input_number.brightness') | int }}" },
          },
          { action: "notify.phone", data: { message: "{{ states.sensor.power.state }} W" } },
        ],
      },
      isKnown: known("input_number.brightness", "sensor.power", "light.terrace"),
    });

    expect(roles(refs)).toEqual({
      "light.terrace": ["action"],
      "input_number.brightness": ["value"],
      "sensor.power": ["value"],
    });
  });
});

describe("buildDependencyIndex", () => {
  const state = (entity_id: string, attributes: HaState["attributes"] = {}): HaState => ({
    entity_id,
    state: "on",
    attributes,
  });

  it("indexes flows, scene and group members, and maps scripts called by key", () => {
    const index = buildDependencyIndex({
      states: [
        state("light.a"),
        state("script.renamed"),
        state("scene.evening", { entity_id: ["light.a", "light.b"] }),
        state("group.lights", { entity_id: ["light.a"] }),
      ],
      registry: [
        { entity_id: "script.renamed", platform: "script", unique_id: "old_key" },
      ] as HaEntityRegistryEntry[],
      configs: new Map<string, unknown>([
        [
          "automation.x",
          {
            triggers: [{ trigger: "state", entity_id: "light.a" }],
            actions: [
              { action: "script.old_key" },
              { action: "automation.trigger", target: { entity_id: "automation.x" } },
            ],
          },
        ],
      ]),
    });

    expect(roles(index.get("automation.x")!)).toEqual({
      "light.a": ["trigger"],
      "script.renamed": ["call"],
    });
    expect(roles(index.get("scene.evening")!)).toEqual({
      "light.a": ["member"],
      "light.b": ["member"],
    });
    expect([...index.get("group.lights")!.keys()]).toEqual(["light.a"]);
  });
});
