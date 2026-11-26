import { collectEntityIds } from "./flow-entities";

describe("collectEntityIds", () => {
  it("finds entities anywhere in a config but not service names", () => {
    const config = {
      triggers: [
        {
          trigger: "zone.entered",
          target: { entity_id: "person.mara" },
          options: { zone: "zone.home" },
        },
      ],
      actions: [
        { action: "light.turn_on", target: { entity_id: ["light.terrasse", "light.terrasse"] } },
        { if: [{ condition: "state", entity_id: "input_boolean.gaeste" }], then: [] },
      ],
    };
    const known = new Set(["person.mara", "zone.home", "light.terrasse", "input_boolean.gaeste"]);

    expect(collectEntityIds({ config, knownEntityIds: known }).sort()).toEqual([
      "input_boolean.gaeste",
      "light.terrasse",
      "person.mara",
      "zone.home",
    ]);
  });
});
