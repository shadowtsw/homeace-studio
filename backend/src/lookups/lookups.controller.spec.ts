import type { HaConnectionService } from "../ha/ha-connection.service";
import { LookupsController } from "./lookups.controller";

describe("LookupsController", () => {
  it("maps areas and labels to camelCase and sorts them by name", async () => {
    const call = jest.fn((type: string) =>
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
    const call = jest.fn((type: string) => Promise.resolve(answers[type]));
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
