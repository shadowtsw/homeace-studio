import { BadRequestException, Logger } from "@nestjs/common";

import { createDemoHome } from "../demo/demo-home";
import { DemoHaConnectionService, DemoHaRestService } from "../demo/demo-ha.services";
import { FakeHa } from "../demo/fake-ha";
import { HaSceneRepository } from "./repositories/ha-scene.repository";
import { ScenesService } from "./scenes.service";

/** Scenes in the demo home, through the real repository and the fake HA. */
function setup() {
  const fake = new FakeHa(createDemoHome());
  const ha = new DemoHaConnectionService(fake);
  const service = new ScenesService(new HaSceneRepository(ha, new DemoHaRestService(fake)));
  const stateOf = async (entityId: string) =>
    (await service.candidate(entityId)).current?.state ?? null;

  return { service, fake, stateOf };
}

describe("ScenesService", () => {
  beforeAll(() => {
    Logger.overrideLogger(false);
  });

  it("reads what the scene sets and what the devices do now", async () => {
    const { service } = setup();

    const view = await service.get("scene.cozy_evening");
    const lamp = view.devices.find((item) => item.entityId === "light.living_room_floor_lamp");

    expect(view.isEditable).toBe(true);
    expect(lamp).toMatchObject({
      name: "Floor lamp",
      domain: "light",
      values: { state: "on", brightness: 64, color_temp_kelvin: 2700 },
      current: { state: "off" },
    });
    expect(lamp?.current?.attributes.supported_color_modes).toEqual(["color_temp", "hs"]);
  });

  it("reads a plain state from scenes.yaml as { state }", async () => {
    const { service } = setup();

    const view = await service.get("scene.nobody_home");

    expect(view.devices.find((item) => item.entityId === "switch.wallbox")?.values).toEqual({
      state: "off",
    });
  });

  it("saves without switching anything and keeps the rest of the config", async () => {
    const { service, stateOf } = setup();
    const before = await stateOf("light.living_room_floor_lamp");

    const view = await service.save("scene.cozy_evening", {
      "light.living_room_floor_lamp": { state: "on", brightness: 25, color_temp_kelvin: 2700 },
      "switch.wallbox": { state: "off" },
    });

    expect(await stateOf("light.living_room_floor_lamp")).toBe(before);
    expect(view.devices.map((item) => [item.entityId, item.values?.brightness ?? null])).toEqual([
      ["light.living_room_floor_lamp", 25],
      ["switch.wallbox", null],
    ]);
  });

  it("keeps HA's metadata and marks new devices as single entities", async () => {
    const { service, fake } = setup();

    await service.save("scene.cozy_evening", {
      "light.living_room_floor_lamp": { state: "on" },
      "switch.wallbox": { state: "off" },
    });
    const config = fake.restGet("config/scene/config/1723912301777") as Record<string, unknown>;

    expect(config).toMatchObject({
      id: "1723912301777",
      name: "Cozy evening",
      metadata: {
        "light.living_room_floor_lamp": { entity_only: true },
        "switch.wallbox": { entity_only: true },
      },
    });
    expect(Object.keys(config.metadata as object)).not.toContain("light.living_room");
  });

  it("leaves devices HA shows under their device without metadata", async () => {
    const { service, fake } = setup();
    const path = "config/scene/config/1723912301777";
    const stored = fake.restGet(path) as Record<string, unknown>;
    // HA's own editor writes no metadata for entities it groups under their device
    fake.restPost(path, {
      ...stored,
      metadata: { "light.living_room_floor_lamp": { entity_only: true } },
    });

    await service.save("scene.cozy_evening", {
      "light.living_room": { state: "on" },
      "light.living_room_floor_lamp": { state: "on" },
      "switch.wallbox": { state: "off" },
    });
    const config = fake.restGet(path) as Record<string, unknown>;

    expect(config.metadata).toEqual({
      "light.living_room_floor_lamp": { entity_only: true },
      "switch.wallbox": { entity_only: true },
    });
  });

  it("previews on the devices and brings them back afterwards", async () => {
    const { service, stateOf } = setup();

    await service.preview("scene.cozy_evening", {
      "light.living_room": { state: "off" },
      "light.living_room_floor_lamp": { state: "on", brightness: 64 },
    });
    expect(await stateOf("light.living_room")).toBe("off");
    expect(await stateOf("light.living_room_floor_lamp")).toBe("on");

    await service.restore("scene.cozy_evening");
    expect(await stateOf("light.living_room")).toBe("on");
    expect(await stateOf("light.living_room_floor_lamp")).toBe("off");
  });

  it("keeps the first state of a device through live edits during the preview", async () => {
    const { service, stateOf } = setup();

    await service.preview("scene.cozy_evening", { "light.living_room": { state: "off" } });
    await service.preview("scene.cozy_evening", { "light.living_room": { state: "on" } });
    await service.preview("scene.cozy_evening", { "light.living_room": { state: "off" } });
    await service.restore("scene.cozy_evening");

    expect(await stateOf("light.living_room")).toBe("on");
  });

  it("brings back only the device that was tried", async () => {
    const { service, stateOf } = setup();

    await service.preview("scene.cozy_evening", {
      "light.living_room": { state: "off" },
      "light.living_room_floor_lamp": { state: "on" },
    });
    await service.restore("scene.cozy_evening", ["light.living_room_floor_lamp"]);

    expect(await stateOf("light.living_room_floor_lamp")).toBe("off");
    expect(await stateOf("light.living_room")).toBe("off");
  });

  it("refuses to save a scene that is not in scenes.yaml", async () => {
    const { service } = setup();

    await expect(service.get("scene.unknown")).resolves.toEqual({
      entityId: "scene.unknown",
      isEditable: false,
      devices: [],
    });
    await expect(service.save("scene.unknown", {})).rejects.toBeInstanceOf(BadRequestException);
  });

  it("offers a new device with its current state as the starting values", async () => {
    const { service } = setup();

    await expect(service.candidate("climate.bathroom")).resolves.toMatchObject({
      domain: "climate",
      values: { state: "heat", temperature: 22 },
    });
  });
});
