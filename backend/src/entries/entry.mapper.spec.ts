import type { HaCategory, HaEntityRegistryEntry, HaState } from "../ha/ha.types";
import type { CategoryScope } from "../categories/categories.constants";
import { mapToEntries, type HaSnapshot } from "./entry.mapper";

function registryEntry(overrides: Partial<HaEntityRegistryEntry>): HaEntityRegistryEntry {
  return {
    entity_id: "automation.example",
    unique_id: "example",
    name: null,
    original_name: null,
    icon: null,
    platform: "automation",
    config_entry_id: null,
    categories: {},
    labels: [],
    area_id: null,
    disabled_by: null,
    hidden_by: null,
    ...overrides,
  };
}

function state(entityId: string, value: string, friendlyName?: string): HaState {
  return { entity_id: entityId, state: value, attributes: { friendly_name: friendlyName } };
}

const NO_CATEGORIES: Record<CategoryScope, HaCategory[]> = {
  automation: [],
  script: [],
  scene: [],
  helpers: [],
  homeace_entities: [],
};

function snapshot(overrides: Partial<HaSnapshot>): HaSnapshot {
  return {
    registryEntries: [],
    states: [],
    helperConfigEntryIds: new Set(),
    categoriesByScope: NO_CATEGORIES,
    labels: [],
    areas: [],
    ...overrides,
  };
}

describe("mapToEntries", () => {
  it("resolves the category path from the scope of the entry kind", () => {
    const entries = mapToEntries(
      snapshot({
        registryEntries: [
          registryEntry({
            entity_id: "automation.terrasse_licht",
            categories: { automation: "cat-auto", helpers: "cat-helper" },
          }),
        ],
        categoriesByScope: {
          ...NO_CATEGORIES,
          automation: [{ category_id: "cat-auto", name: "Haus/Terrasse", icon: null }],
          helpers: [{ category_id: "cat-helper", name: "Falsch", icon: null }],
        },
      }),
    );

    expect(entries[0]).toMatchObject({
      kind: "automation",
      categoryId: "cat-auto",
      categoryPath: "Haus/Terrasse",
    });
  });

  it("detects helpers by domain and by helper config entry, and skips other entities", () => {
    const entries = mapToEntries(
      snapshot({
        registryEntries: [
          registryEntry({ entity_id: "input_number.helligkeit" }),
          registryEntry({ entity_id: "sensor.pv_ueberschuss", config_entry_id: "template-entry" }),
          registryEntry({ entity_id: "sensor.temperatur", config_entry_id: "zigbee-entry" }),
          registryEntry({ entity_id: "light.terrasse" }),
        ],
        helperConfigEntryIds: new Set(["template-entry"]),
      }),
    );

    const helperIds = entries.map((entry) => entry.entityId);
    expect(helperIds).toEqual(["input_number.helligkeit", "sensor.pv_ueberschuss"]);
    expect(entries.every((entry) => entry.kind === "helper")).toBe(true);
  });

  it("prefers the user's name, then the friendly name, then the integration name", () => {
    const entries = mapToEntries(
      snapshot({
        registryEntries: [
          registryEntry({ entity_id: "script.a", name: "User name", original_name: "Original" }),
          registryEntry({ entity_id: "script.b", original_name: "Original" }),
          registryEntry({ entity_id: "script.c", original_name: "Original" }),
        ],
        states: [state("script.a", "off", "Friendly"), state("script.b", "off", "Friendly")],
      }),
    );

    expect(entries.map((entry) => entry.name)).toEqual(["User name", "Friendly", "Original"]);
  });

  it("marks disabled entities and has no state for them", () => {
    const entries = mapToEntries(
      snapshot({
        registryEntries: [registryEntry({ entity_id: "scene.kino", disabled_by: "user" })],
      }),
    );

    expect(entries[0]).toMatchObject({ isDisabled: true, state: null });
  });

  it("resolves label and area names and skips labels HA no longer knows", () => {
    const entries = mapToEntries(
      snapshot({
        registryEntries: [registryEntry({ labels: ["licht", "deleted"], area_id: "terrasse" })],
        labels: [{ label_id: "licht", name: "Licht", icon: null, color: "amber" }],
        areas: [{ area_id: "terrasse", name: "Terrasse", icon: null }],
      }),
    );

    expect(entries[0]?.labels).toEqual([{ labelId: "licht", name: "Licht", color: "amber" }]);
    expect(entries[0]?.area).toEqual({ areaId: "terrasse", name: "Terrasse" });
  });

  it("takes the user's icon first, then the icon from the state", () => {
    const entries = mapToEntries(
      snapshot({
        registryEntries: [
          registryEntry({ entity_id: "script.a", icon: "mdi:star" }),
          registryEntry({ entity_id: "script.b" }),
        ],
        states: [
          { entity_id: "script.a", state: "off", attributes: { icon: "mdi:sun" } },
          { entity_id: "script.b", state: "off", attributes: { icon: "mdi:sun" } },
        ],
      }),
    );

    expect(entries.map((entry) => entry.icon)).toEqual(["mdi:star", "mdi:sun"]);
  });

  it("adds entities that exist only as state, without registry data", () => {
    const entries = mapToEntries(
      snapshot({ states: [state("input_boolean.yaml_schalter", "on", "YAML Schalter")] }),
    );

    expect(entries).toEqual([
      expect.objectContaining({
        entityId: "input_boolean.yaml_schalter",
        name: "YAML Schalter",
        state: "on",
        categoryPath: null,
        isInRegistry: false,
      }),
    ]);
  });
});
