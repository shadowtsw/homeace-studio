import type { HaEntityRegistryEntry } from "../ha/ha.types";
import { nameWithinDevice, toEntityOptions } from "./entity-options";

function registry(entityId: string, extra: Partial<HaEntityRegistryEntry>): HaEntityRegistryEntry {
  return {
    entity_id: entityId,
    unique_id: entityId,
    name: null,
    original_name: null,
    icon: null,
    platform: "demo",
    config_entry_id: null,
    categories: {},
    labels: [],
    area_id: null,
    disabled_by: null,
    hidden_by: null,
    ...extra,
  };
}

describe("entity options", () => {
  it("takes the name within the device, or the full name", () => {
    expect(nameWithinDevice("Bewegungsmelder Flur Batterie", "Bewegungsmelder Flur")).toBe(
      "Batterie",
    );
    expect(nameWithinDevice("Flurlicht", "Bewegungsmelder Flur")).toBe("Flurlicht");
    expect(nameWithinDevice("Bewegungsmelder Flur", "Bewegungsmelder Flur")).toBe(
      "Bewegungsmelder Flur",
    );
    expect(nameWithinDevice("Gästemodus", null)).toBe("Gästemodus");
  });

  it("adds device, area (own or the device's), labels and unit", () => {
    const options = toEntityOptions({
      states: [
        {
          entity_id: "sensor.flur_batterie",
          state: "78",
          attributes: { friendly_name: "Melder Flur Batterie", unit_of_measurement: "%" },
        },
        { entity_id: "light.bad", state: "off", attributes: { friendly_name: "Bad" } },
        { entity_id: "input_boolean.gast", state: "on", attributes: {} },
      ],
      registry: [
        registry("sensor.flur_batterie", { device_id: "d1", labels: ["batt"] }),
        registry("light.bad", { device_id: "d2", area_id: "bad" }),
      ],
      devices: [
        { id: "d1", name: "Melder Flur", name_by_user: null, area_id: "flur" },
        { id: "d2", name: "Spot", name_by_user: "Badlicht", area_id: "flur" },
      ],
      areas: [
        { area_id: "flur", name: "Flur", icon: null },
        { area_id: "bad", name: "Bad", icon: null },
      ],
      labels: [{ label_id: "batt", name: "Batterien", icon: null, color: null }],
      entityCategories: [],
    });

    expect(options.map((option) => option.entityId)).toEqual([
      "light.bad",
      "input_boolean.gast",
      "sensor.flur_batterie",
    ]);
    expect(options[2]).toMatchObject({
      shortName: "Batterie",
      deviceName: "Melder Flur",
      areaName: "Flur",
      labels: ["Batterien"],
      unit: "%",
    });
    expect(options[0]).toMatchObject({ deviceName: "Badlicht", areaId: "bad", areaName: "Bad" });
    expect(options[1]).toMatchObject({
      name: "input_boolean.gast",
      deviceId: null,
      areaName: null,
    });
  });

  it("names the folder from HomeAce Studio's own scope and tells which entities can have one", () => {
    const options = toEntityOptions({
      states: [
        { entity_id: "light.terrasse", state: "off", attributes: { friendly_name: "Terrasse" } },
        { entity_id: "light.yaml", state: "off", attributes: { friendly_name: "YAML-Licht" } },
      ],
      registry: [
        // A category in another scope must not count as its folder.
        registry("light.terrasse", { categories: { homeace_entities: "c1", automation: "c9" } }),
      ],
      devices: [],
      areas: [],
      labels: [],
      entityCategories: [{ category_id: "c1", name: "Haus/Terrasse", icon: null }],
    });

    expect(options.find((option) => option.entityId === "light.terrasse")).toMatchObject({
      categoryPath: "Haus/Terrasse",
      isInRegistry: true,
    });
    expect(options.find((option) => option.entityId === "light.yaml")).toMatchObject({
      categoryPath: null,
      isInRegistry: false,
    });
  });
});
