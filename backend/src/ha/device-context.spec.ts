import { createDeviceContext } from "./device-context";
import type { HaDevice } from "./ha.types";

const device = (id: string, extra: Partial<HaDevice> = {}): HaDevice => ({
  id,
  name: id,
  name_by_user: null,
  area_id: null,
  ...extra,
});

const strip = device("strip", { name: "Power strip", area_id: "living_room" });
const outlet = device("outlet", { name: "Outlet 1", parent_device_id: "strip" });

describe("device context", () => {
  it("gives a child device without an area its parent's, like HA", () => {
    const context = createDeviceContext([strip, outlet]);

    expect(context.areaIdOf(outlet)).toBe("living_room");
    expect(context.areaIdOf({ ...outlet, area_id: "kitchen" })).toBe("kitchen");
    expect(context.areaIdOf(device("plain"))).toBeNull();
  });

  it("copes with a parent HA does not list", () => {
    const context = createDeviceContext([outlet]);

    expect(context.areaIdOf(outlet)).toBeNull();
    expect(context.nameOf(outlet)).toBe("Outlet 1");
  });

  it("puts the parent's name in front of a child's, once", () => {
    const named = device("named", { name: "Power strip outlet 2", parent_device_id: "strip" });
    const unnamed = device("unnamed", { name: null, parent_device_id: "strip" });
    const context = createDeviceContext([strip, outlet, named, unnamed]);

    expect(context.nameOf(outlet)).toBe("Power strip Outlet 1");
    expect(context.nameOf(named)).toBe("Power strip outlet 2");
    expect(context.nameOf(unnamed)).toBe("Power strip");
    expect(context.nameOf(strip)).toBe("Power strip");
  });

  it("prefers the user's names, and ignores blank ones", () => {
    const renamed = { ...strip, name_by_user: "TV corner" };
    const child = { ...outlet, name_by_user: "  " };
    const context = createDeviceContext([renamed, child]);

    expect(context.nameOf(child)).toBe("TV corner Outlet 1");
  });
});
