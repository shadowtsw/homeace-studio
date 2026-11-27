import { entityIdsIn } from "./entity-ids";

describe("entityIdsIn", () => {
  it("reads a single ID, a list and comma-separated text", () => {
    expect(entityIdsIn("light.kitchen")).toEqual(["light.kitchen"]);
    expect(entityIdsIn(["light.a", " switch.b "])).toEqual(["light.a", "switch.b"]);
    expect(entityIdsIn("light.a, light.b ,light.c")).toEqual(["light.a", "light.b", "light.c"]);
  });

  it("skips templates, other values and invalid IDs", () => {
    expect(entityIdsIn(["light.a", "{{ trigger.entity_id }}", 3, null, "Light.B"])).toEqual([
      "light.a",
    ]);
    // Commas only separate in text, not inside a list item
    expect(entityIdsIn(["light.a, light.b"])).toEqual([]);
    expect(entityIdsIn(undefined)).toEqual([]);
    expect(entityIdsIn({ entity_id: "light.a" })).toEqual([]);
    expect(entityIdsIn("")).toEqual([]);
  });
});
