import type { HaDevice } from "./ha.types";

/**
 * Area and display name of a device the way HA resolves them, including child devices (HA 2026.9+):
 * parts of one product such as the outlets of a power strip, linked by `parent_device_id`. Nesting
 * is one level only.
 */
export type DeviceContext = {
  /** The device's own area, else its parent's (HA's "effective area"); null when neither has one. */
  areaIdOf: (device: HaDevice) => string | null;
  /**
   * The name to show: "Living room power strip Outlet 1" for a child named "Outlet 1", so it stays
   * recognizable in flat lists. A child whose name already starts with the parent's keeps its name.
   */
  nameOf: (device: HaDevice) => string | null;
};

/** User name first, like HA; blank names count as missing. */
function ownName(device: HaDevice): string | null {
  return device.name_by_user?.trim() || device.name?.trim() || null;
}

export function createDeviceContext(devices: readonly HaDevice[]): DeviceContext {
  const byId = new Map(devices.map((device) => [device.id, device]));
  const parentOf = (device: HaDevice): HaDevice | undefined =>
    device.parent_device_id ? byId.get(device.parent_device_id) : undefined;

  const areaIdOf = (device: HaDevice): string | null =>
    device.area_id ?? parentOf(device)?.area_id ?? null;

  const nameOf = (device: HaDevice): string | null => {
    const name = ownName(device);
    const parent = parentOf(device);
    const parentName = parent ? ownName(parent) : null;

    if (!parentName) return name;
    if (!name) return parentName;

    const alreadyNamed = name.toLocaleLowerCase().startsWith(parentName.toLocaleLowerCase());

    return alreadyNamed ? name : `${parentName} ${name}`;
  };

  return { areaIdOf, nameOf };
}
