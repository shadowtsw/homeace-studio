import type { DependencyRole } from "../dependencies/dependency-analysis";
import type { Entry } from "../entries/entry.model";
import { deriveEntryAreas, type EntryAreasInput } from "./entry-areas";

const entry = (entityId: string, area: Entry["area"] = null): Entry =>
  ({ entityId, name: entityId, area }) as Entry;

const uses = (...ids: string[]): Map<string, Set<DependencyRole>> =>
  new Map(ids.map((id) => [id, new Set<DependencyRole>(["action"])]));

const base: EntryAreasInput = {
  entries: [],
  states: [],
  registry: [
    { entity_id: "light.a", device_id: "lamp", area_id: null },
    { entity_id: "light.b", device_id: "lamp2", area_id: null },
    { entity_id: "light.c", device_id: null, area_id: "garden" },
    { entity_id: "light.d", device_id: null, area_id: "gone_area" },
  ] as EntryAreasInput["registry"],
  devices: [
    { id: "lamp", name: "Lamp", name_by_user: null, area_id: "garden" },
    { id: "lamp2", name: "Lamp 2", name_by_user: "Porch lamp", area_id: "porch" },
  ],
  areas: [
    { area_id: "garden", name: "Garden", icon: null },
    { area_id: "porch", name: "Porch", icon: null },
  ],
  index: new Map(),
};

describe("deriveEntryAreas", () => {
  it("puts the area most of the used things are in first", () => {
    const [result] = deriveEntryAreas({
      ...base,
      entries: [entry("script.x")],
      index: new Map([["script.x", uses("light.b", "light.a", "light.c")]]),
    });

    expect(result?.areas.map((area) => [area.areaId, area.via?.name])).toEqual([
      ["garden", "Lamp"],
      ["porch", "Porch lamp"],
    ]);
  });

  it("ignores areas HA does not know (any more)", () => {
    const [result] = deriveEntryAreas({
      ...base,
      entries: [entry("script.x"), entry("automation.y", { areaId: "gone_area", name: "Old" })],
      index: new Map([["script.x", uses("light.d")]]),
    });

    expect(result?.areas).toEqual([]);
  });

  it("finds the area of a child device through its parent", () => {
    const [result] = deriveEntryAreas({
      ...base,
      entries: [entry("script.x")],
      registry: [
        { entity_id: "switch.top", device_id: "top", area_id: null },
      ] as EntryAreasInput["registry"],
      devices: [
        { id: "plug", name: "Eve Energy", name_by_user: null, area_id: "porch" },
        { id: "top", name: "Top", name_by_user: null, area_id: null, parent_device_id: "plug" },
      ],
      index: new Map([["script.x", uses("switch.top")]]),
    });

    expect(result?.areas.map((area) => [area.areaId, area.via?.name])).toEqual([
      ["porch", "Eve Energy Top"],
    ]);
  });

  it("goes only one step through users", () => {
    const result = deriveEntryAreas({
      ...base,
      entries: [entry("input_boolean.h"), entry("script.user"), entry("automation.caller")],
      index: new Map([
        ["script.user", uses("input_boolean.h", "light.a")],
        ["automation.caller", uses("script.user")],
      ]),
    });

    expect(result.map((item) => [item.entityId, item.areas.map((area) => area.source)])).toEqual([
      ["input_boolean.h", ["usedBy"]],
      ["script.user", ["uses"]],
      // Calling a script without an area of its own brings no area.
      ["automation.caller", []],
    ]);
  });
});
