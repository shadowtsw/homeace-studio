import type { HaCallOptions, HaConnectionService } from "../ha/ha-connection.service";
import { LookupsController } from "./lookups.controller";

describe("LookupsController", () => {
  it("maps areas and labels to camelCase and sorts them by name", async () => {
    const call = jest.fn(({ type }: HaCallOptions) =>
      Promise.resolve(
        type === "config/area_registry/list"
          ? [
              { area_id: "terrasse", name: "Terrasse", icon: null },
              { area_id: "bad", name: "bad", icon: "mdi:shower" },
            ]
          : [{ label_id: "licht", name: "Licht", icon: null, color: "amber" }],
      ),
    );
    const controller = new LookupsController({ call } as unknown as HaConnectionService);

    await expect(controller.areas()).resolves.toEqual([
      { areaId: "bad", name: "bad", icon: "mdi:shower" },
      { areaId: "terrasse", name: "Terrasse", icon: null },
    ]);
    await expect(controller.labels()).resolves.toEqual([
      { labelId: "licht", name: "Licht", icon: null, color: "amber" },
    ]);
  });

  it("lists icon pack resources, and none when HA has no dashboards set up", async () => {
    const resources = [
      { id: "1", type: "module", url: "/local/community/custom-brand-icons/custom-brand-icons.js" },
      { id: "2", type: "module", url: "/local/community/lovelace-mushroom/mushroom.js" },
    ];
    const working = new LookupsController({
      call: jest.fn(() => Promise.resolve(resources)),
    } as unknown as HaConnectionService);
    const refusing = new LookupsController({
      call: jest.fn(() => Promise.reject(new Error("unknown command"))),
    } as unknown as HaConnectionService);

    await expect(working.iconPackResources()).resolves.toEqual([
      "/local/community/custom-brand-icons/custom-brand-icons.js",
    ]);
    await expect(refusing.iconPackResources()).resolves.toEqual([]);
  });

  it("lists floors in HA's order: by level, floors without one last", async () => {
    const call = jest.fn(() =>
      Promise.resolve([
        { floor_id: "attic", name: "Attic", icon: null, level: null },
        { floor_id: "og", name: "Obergeschoss", icon: "mdi:home-floor-1", level: 1 },
        { floor_id: "eg", name: "Erdgeschoss", icon: null, level: 0 },
      ]),
    );
    const controller = new LookupsController({ call } as unknown as HaConnectionService);

    await expect(controller.floors()).resolves.toEqual([
      { floorId: "eg", name: "Erdgeschoss", icon: null },
      { floorId: "og", name: "Obergeschoss", icon: "mdi:home-floor-1" },
      { floorId: "attic", name: "Attic", icon: null },
    ]);
    expect(call).toHaveBeenCalledWith({ type: "config/floor_registry/list" });
  });

  it("lists entities with name, domain, state, select options, device and area", async () => {
    const answers: Record<string, unknown> = {
      get_states: [
        {
          entity_id: "input_select.modus",
          state: "Tag",
          attributes: { friendly_name: "Modus", options: ["Tag", "Nacht"] },
        },
        { entity_id: "light.flur", state: "on", attributes: { options: [1, 2] } },
      ],
      "config/entity_registry/list": [
        {
          entity_id: "light.flur",
          unique_id: "x",
          name: null,
          original_name: null,
          icon: null,
          platform: "hue",
          config_entry_id: null,
          categories: {},
          labels: [],
          area_id: null,
          device_id: "d1",
          disabled_by: null,
          hidden_by: null,
        },
      ],
      "config/device_registry/list": [
        { id: "d1", name: "Deckenlampe", name_by_user: null, area_id: "flur" },
      ],
      "config/area_registry/list": [{ area_id: "flur", name: "Flur", icon: null }],
      "config/label_registry/list": [],
      "config/category_registry/list": [],
    };
    const call = jest.fn(({ type }: HaCallOptions) => Promise.resolve(answers[type]));
    const controller = new LookupsController({ call } as unknown as HaConnectionService);

    const entities = await controller.entities();

    expect(entities.map((entity) => entity.entityId)).toEqual(["light.flur", "input_select.modus"]);
    expect(entities[0]).toMatchObject({
      domain: "light",
      state: "on",
      options: null,
      deviceName: "Deckenlampe",
      areaName: "Flur",
    });
    expect(entities[1]).toMatchObject({ name: "Modus", options: ["Tag", "Nacht"], deviceId: null });
  });
});
