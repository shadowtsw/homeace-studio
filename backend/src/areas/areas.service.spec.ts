import { createDemoHome } from "../demo/demo-home";
import { DemoHaConnectionService } from "../demo/demo-ha.services";
import { FakeHa } from "../demo/fake-ha";
import { HA_COMMAND } from "../ha/ha.constants";
import type { HaArea, HaDevice } from "../ha/ha.types";
import { AreasService } from "./areas.service";

function setup() {
  const ha = new DemoHaConnectionService(new FakeHa(createDemoHome()));
  return { ha, service: new AreasService(ha) };
}

describe("AreasService", () => {
  it("creates an area with name and icon", async () => {
    const { ha, service } = setup();

    const area = await service.create({ name: "  Bedroom ", icon: "mdi:bed" });

    expect(area).toEqual({ areaId: "bedroom", name: "Bedroom", icon: "mdi:bed" });
    expect(
      (await ha.call<HaArea[]>({ type: HA_COMMAND.areaRegistryList })).map((item) => item.name),
    ).toContain("Bedroom");
  });

  it("refuses a name that exists, ignoring case", async () => {
    await expect(setup().service.create({ name: "terrace", icon: null })).rejects.toMatchObject({
      response: { message: "AREA_NAME_TAKEN", params: { name: "terrace" } },
    });
  });

  it("renames an area and changes its icon, but not into another area's name", async () => {
    const { service } = setup();

    expect(
      await service.update({ areaId: "garage", changes: { name: "Carport", icon: "mdi:garage" } }),
    ).toEqual({
      areaId: "garage",
      name: "Carport",
      icon: "mdi:garage",
    });
    await expect(
      service.update({ areaId: "garage", changes: { name: "Garden" } }),
    ).rejects.toMatchObject({
      response: { message: "AREA_NAME_TAKEN" },
    });
    // Its own name in another case is fine.
    await expect(
      service.update({ areaId: "garage", changes: { name: "CARPORT" } }),
    ).resolves.toMatchObject({
      name: "CARPORT",
    });
  });

  it("deletes an area; its devices stay without one", async () => {
    const { ha, service } = setup();

    await service.delete("garage");

    const devices = await ha.call<HaDevice[]>({ type: HA_COMMAND.deviceRegistryList });
    expect(devices.find((device) => device.name === "Wallbox")?.area_id).toBeNull();
    await expect(service.delete("garage")).rejects.toMatchObject({
      response: { message: "AREA_NOT_FOUND" },
    });
  });
});
