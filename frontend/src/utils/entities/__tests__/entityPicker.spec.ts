import { describe, expect, it } from "vitest";

import type { EntityOption } from "@/types/editor";

import {
  NO_AREA,
  countByDevice,
  criterionOptions,
  groupByDevice,
  matchesCriteria,
  matchesQuery,
  rowLabel,
  suggestEntities,
} from "../entityPicker";

function entity(entityId: string, extra: Partial<EntityOption> = {}): EntityOption {
  return {
    entityId,
    name: entityId,
    shortName: entityId,
    domain: entityId.split(".")[0] ?? "",
    state: "on",
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
    ...extra,
  };
}

const MOTION = { deviceId: "d1", deviceName: "Melder Flur", areaId: "flur", areaName: "Flur" };
const ENTITIES = [
  entity("binary_sensor.flur", { ...MOTION, name: "Bewegung Flur", shortName: "Bewegung Flur" }),
  entity("sensor.flur_batterie", {
    ...MOTION,
    name: "Melder Flur Batterie",
    shortName: "Batterie",
  }),
  entity("light.kueche", {
    name: "Küchenlicht",
    shortName: "Küchenlicht",
    deviceId: "d2",
    deviceName: "Küchenlicht",
    areaId: "kueche",
    areaName: "Küche",
    labels: ["Licht"],
  }),
  entity("input_boolean.gast", { name: "Gästemodus", shortName: "Gästemodus" }),
];
const kindLabel = (domain: string) => ({ light: "Licht", sensor: "Messwert" })[domain] ?? domain;

describe("entity picker", () => {
  it("finds words in any order, without umlauts, across device, area and kind", () => {
    expect(matchesQuery(ENTITIES[2]!, "kueche licht", kindLabel)).toBe(true);
    expect(matchesQuery(ENTITIES[1]!, "flur messwert", kindLabel)).toBe(true);
    expect(matchesQuery(ENTITIES[1]!, "flur licht", kindLabel)).toBe(false);
  });

  it("combines criteria with and; entities without area count as no area", () => {
    expect(
      ENTITIES.filter((e) => matchesCriteria(e, { area: "Flur", label: null, kind: "sensor" })),
    ).toHaveLength(1);
    expect(criterionOptions(ENTITIES, "area")).toEqual([
      { value: "Flur", count: 2 },
      { value: "Küche", count: 1 },
      { value: NO_AREA, count: 1 },
    ]);
  });

  it("suggests what the flow uses, then the automation's area", () => {
    const suggested = suggestEntities(ENTITIES, new Set(["input_boolean.gast"]), "flur");

    expect(suggested.map((e) => e.entityId)).toEqual([
      "input_boolean.gast",
      "binary_sensor.flur",
      "sensor.flur_batterie",
    ]);
  });

  it("groups by device and labels rows by where they stand", () => {
    const counts = countByDevice(ENTITIES);

    expect(groupByDevice(ENTITIES).map((group) => group.entities.length)).toEqual([2, 1, 1]);
    expect(rowLabel(ENTITIES[1]!, "card", counts)).toBe("Batterie");
    expect(rowLabel(ENTITIES[1]!, "list", counts)).toBe("Melder Flur: Batterie");
    expect(rowLabel(ENTITIES[0]!, "list", counts)).toBe("Bewegung Flur");
    expect(rowLabel(ENTITIES[2]!, "list", counts)).toBe("Küchenlicht");
    expect(rowLabel(ENTITIES[3]!, "list", counts)).toBe("Gästemodus");
  });
});
