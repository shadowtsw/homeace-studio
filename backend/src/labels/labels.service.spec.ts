import { createDemoHome } from "../demo/demo-home";
import { DemoHaConnectionService } from "../demo/demo-ha.services";
import { FakeHa } from "../demo/fake-ha";
import type { Entry } from "../entries/entry.model";
import { HA_COMMAND } from "../ha/ha.constants";
import type { HaEntityRegistryEntry, HaLabel } from "../ha/ha.types";
import type { HomeSnapshotService } from "../snapshot/home-snapshot.service";
import { labelUsage } from "./label-usage";
import { LabelsService } from "./labels.service";

function setup() {
  const ha = new DemoHaConnectionService(new FakeHa(createDemoHome()));
  const snapshot = {
    get: async () => ({
      entries: [],
      registry: await ha.call<HaEntityRegistryEntry[]>(HA_COMMAND.entityRegistryList),
      devices: [],
      areas: [],
      configs: new Map(),
    }),
  } as unknown as HomeSnapshotService;

  return { ha, service: new LabelsService(ha, snapshot) };
}

const names = async (ha: DemoHaConnectionService) =>
  (await ha.call<HaLabel[]>(HA_COMMAND.labelRegistryList)).map((label) => label.name);

describe("LabelsService", () => {
  it("creates a label with colour and icon", async () => {
    const { ha, service } = setup();

    const label = await service.create({ name: "  Holiday ", color: "indigo", icon: "mdi:beach" });

    expect(label).toEqual({
      labelId: "holiday",
      name: "Holiday",
      color: "indigo",
      icon: "mdi:beach",
    });
    expect(await names(ha)).toContain("Holiday");
  });

  it("refuses a name that exists, ignoring case", async () => {
    await expect(setup().service.create({ name: "lights" })).rejects.toMatchObject({
      response: { message: "LABEL_NAME_TAKEN", params: { name: "lights" } },
    });
  });

  it("renames and recolours a label but keeps its id, so flows keep working", async () => {
    const { service } = setup();

    expect(
      await service.update({ labelId: "lights", fields: { name: "Lighting", color: "blue" } }),
    ).toMatchObject({
      labelId: "lights",
      name: "Lighting",
      color: "blue",
    });
    await expect(
      service.update({ labelId: "lights", fields: { name: "Weather" } }),
    ).rejects.toMatchObject({
      response: { message: "LABEL_NAME_TAKEN" },
    });
    // Its own name in another case is fine; null clears the colour.
    await expect(
      service.update({ labelId: "lights", fields: { name: "LIGHTING", color: null } }),
    ).resolves.toMatchObject({
      name: "LIGHTING",
      color: null,
    });
  });

  it("deletes a label everywhere, and says when one does not exist", async () => {
    const { ha, service } = setup();

    await service.delete("lights");

    expect(await names(ha)).not.toContain("Lights");
    const registry = await ha.call<HaEntityRegistryEntry[]>(HA_COMMAND.entityRegistryList);
    expect(registry.some((entry) => entry.labels.includes("lights"))).toBe(false);
    await expect(service.delete("lights")).rejects.toMatchObject({
      response: { message: "LABEL_NOT_FOUND" },
    });
  });
});

describe("label usage", () => {
  const entry = (entityId: string, labelIds: string[]) =>
    ({ entityId, name: entityId, labels: labelIds.map((labelId) => ({ labelId })) }) as Entry;
  const registryEntry = (entityId: string, labels: string[]) =>
    ({ entity_id: entityId, labels }) as HaEntityRegistryEntry;

  it("counts entries, other entities, devices and areas apart", () => {
    const usage = labelUsage({
      labelId: "lights",
      sources: {
        entries: [entry("script.all_off", ["lights"]), entry("script.other", [])],
        registry: [
          registryEntry("script.all_off", ["lights"]),
          registryEntry("light.terrace", ["lights"]),
          registryEntry("light.garden", []),
        ],
        devices: [
          { id: "d1", name: "Lamp", name_by_user: null, area_id: null, labels: ["lights"] },
        ],
        areas: [{ area_id: "terrace", name: "Terrace", icon: null, labels: ["lights", "x"] }],
        configs: new Map(),
      },
    });

    expect(usage).toMatchObject({
      entries: 1,
      entities: 1,
      devices: 1,
      areas: 1,
      flowsAsTarget: [],
    });
  });

  it("finds flows that use the label as a target, also nested and in a list", () => {
    const usage = labelUsage({
      labelId: "lights",
      sources: {
        entries: [entry("script.all_off", []), entry("automation.night", [])],
        registry: [],
        devices: [],
        areas: [],
        configs: new Map<string, unknown>([
          [
            "script.all_off",
            { sequence: [{ action: "light.turn_off", target: { label_id: "lights" } }] },
          ],
          [
            "automation.night",
            {
              actions: [
                {
                  if: [],
                  then: [{ action: "light.turn_off", target: { label_id: ["x", "lights"] } }],
                },
              ],
            },
          ],
          [
            "automation.other",
            { actions: [{ action: "light.turn_on", target: { label_id: "weather" } }] },
          ],
        ]),
      },
    });

    expect(usage.flowsAsTarget.map((flow) => flow.entityId)).toEqual([
      "automation.night",
      "script.all_off",
    ]);
  });
});
