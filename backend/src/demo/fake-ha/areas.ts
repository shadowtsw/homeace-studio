import { HaCommandError } from "../../ha/ha-command.error";
import type { HaArea } from "../../ha/ha.types";
import { emit, type FakeHaData } from "./data";
import { ERROR_CODE, slugify, text, type Payload } from "./shared";

function requireArea({ ha, areaId }: { ha: FakeHaData; areaId: unknown }): HaArea {
  const area = ha.areas.find((item) => item.area_id === areaId);
  if (!area) throw new HaCommandError(ERROR_CODE.notFound, "Area not found");
  return area;
}

function requireFreeAreaName({
  ha,
  name,
  ownId,
}: {
  ha: FakeHaData;
  name: string;
  ownId: string | null;
}): void {
  const taken = ha.areas.some(
    (area) => area.area_id !== ownId && area.name.toLowerCase() === name.toLowerCase(),
  );
  if (!name || taken)
    throw new HaCommandError(ERROR_CODE.invalid, `The name "${name}" is already in use`);
}

/** Like HA: names are unique (ignoring case), the ID comes from the name. */
export function createArea({ ha, payload }: { ha: FakeHaData; payload: Payload }): HaArea {
  const name = text(payload.name).trim();
  requireFreeAreaName({ ha, name, ownId: null });

  const base = slugify(name) || "area";
  let areaId = base;
  for (let n = 2; ha.areas.some((area) => area.area_id === areaId); n++) areaId = `${base}_${n}`;

  const area: HaArea = {
    area_id: areaId,
    name,
    icon: typeof payload.icon === "string" ? payload.icon : null,
  };
  ha.areas.push(area);
  emit({ ha, eventType: "area_registry_updated", data: { action: "create", area_id: areaId } });

  return structuredClone(area);
}

export function updateArea({ ha, payload }: { ha: FakeHaData; payload: Payload }): HaArea {
  const area = requireArea({ ha, areaId: payload.area_id });

  if (payload.name !== undefined) {
    const name = text(payload.name).trim();
    requireFreeAreaName({ ha, name, ownId: area.area_id });
    area.name = name;
  }
  if (payload.icon !== undefined)
    area.icon = typeof payload.icon === "string" ? payload.icon : null;

  emit({
    ha,
    eventType: "area_registry_updated",
    data: { action: "update", area_id: area.area_id },
  });

  return structuredClone(area);
}

/** Like HA: devices and entities in the area lose it. */
export function deleteArea({ ha, payload }: { ha: FakeHaData; payload: Payload }): null {
  const area = requireArea({ ha, areaId: payload.area_id });

  ha.areas.splice(ha.areas.indexOf(area), 1);
  for (const device of ha.devices.values())
    if (device.area_id === area.area_id) device.area_id = null;
  for (const entry of ha.registry.values())
    if (entry.area_id === area.area_id) entry.area_id = null;
  emit({
    ha,
    eventType: "area_registry_updated",
    data: { action: "remove", area_id: area.area_id },
  });

  return null;
}
