import { describe, expect, it } from "vitest";

import type { EntityOption } from "@/types/editor";
import type { Entry } from "@/types/entry";

import { filterListEntities, groupListItems, isEntityInCategory } from "../entityList";

function entity(overrides: Partial<EntityOption>): EntityOption {
  return {
    entityId: "light.example",
    name: "Example",
    shortName: "Example",
    domain: "light",
    state: "off",
    unit: null,
    deviceClass: null,
    options: null,
    deviceId: null,
    deviceName: null,
    areaId: null,
    areaName: null,
    labels: [],
    categoryPath: null,
    isInRegistry: true,
    ...overrides,
  };
}

const lamp = entity({
  entityId: "light.terrasse",
  name: "Terrassenlicht",
  deviceName: "Terrassenleuchte",
  areaId: "terrace",
  areaName: "Terrasse",
  categoryPath: "Haus/Terrasse",
});
const loose = entity({ entityId: "sensor.wind", name: "Wind", areaId: null });
const automation = entity({ entityId: "automation.licht", name: "Licht bei Bewegung" });

describe("plain entities in the list", () => {
  it("belong to their folder and everything above it, loose ones to 'Ohne Kategorie'", () => {
    expect(isEntityInCategory(lamp, "Haus")).toBe(true);
    expect(isEntityInCategory(lamp, "Haus/Terrasse")).toBe(true);
    expect(isEntityInCategory(lamp, "Hausflur")).toBe(false);
    expect(isEntityInCategory(loose, "__uncategorized")).toBe(true);
    expect(isEntityInCategory(lamp, "__uncategorized")).toBe(false);
  });

  it("belong to HA's area, never to favorites or the check-up", () => {
    expect(isEntityInCategory(lamp, "__area:terrace")).toBe(true);
    expect(isEntityInCategory(loose, "__area:")).toBe(true);
    expect(isEntityInCategory(lamp, "__favorites")).toBe(false);
    expect(isEntityInCategory(lamp, "__checkup")).toBe(false);
  });

  it("are searched by name, entity ID, device and area, and leave out entries", () => {
    const filter = (search: string) =>
      filterListEntities([lamp, loose, automation], {
        category: "__all",
        search,
        entryIds: new Set(["automation.licht"]),
      }).map((item) => item.entityId);

    expect(filter("")).toEqual(["light.terrasse", "sensor.wind"]);
    expect(filter("leuchte")).toEqual(["light.terrasse"]);
    expect(filter("TERRASSE")).toEqual(["light.terrasse"]);
    expect(filter("licht")).toEqual(["light.terrasse"]);
  });

  it("join the folder groups after the entries; loose ones go with 'Ohne Kategorie'", () => {
    const entry = { entityId: "automation.a", categoryPath: "Haus/Terrasse" } as Entry;
    const groups = groupListItems([entry], [loose, lamp]);

    expect(groups.map((group) => group.path)).toEqual(["Haus/Terrasse", null]);
    expect(groups[0]).toMatchObject({ entries: [entry], entities: [lamp] });
    expect(groups[1]).toMatchObject({ entries: [], entities: [loose] });
  });
});
