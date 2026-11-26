import { Controller, Get } from "@nestjs/common";

import { CATEGORY_SCOPE } from "../categories/categories.constants";
import { HaConnectionService } from "../ha/ha-connection.service";
import { HA_COMMAND } from "../ha/ha.constants";
import type {
  HaArea,
  HaCategory,
  HaDevice,
  HaEntityRegistryEntry,
  HaFloor,
  HaLabel,
  HaLovelaceResource,
  HaState,
} from "../ha/ha.types";
import { toEntityOptions, type EntityOption } from "./entity-options";
import { iconResourceUrls } from "./icon-resources";

export type Area = { areaId: string; name: string; icon: string | null };
export type Floor = { floorId: string; name: string; icon: string | null };
export type Label = { labelId: string; name: string; icon: string | null; color: string | null };

const byName = (first: { name: string }, second: { name: string }): number =>
  first.name.localeCompare(second.name, undefined, { sensitivity: "base" });

/**
 * HA's areas, floors, labels and entities, for the pickers in the detail view and the flow editor. Read-only and a plain mapping, so the
 * controller talks to the HA connection directly instead of going through a service.
 */
@Controller()
export class LookupsController {
  constructor(private readonly ha: HaConnectionService) {}

  @Get("areas")
  async areas(): Promise<Area[]> {
    const areas = await this.ha.call<HaArea[]>(HA_COMMAND.areaRegistryList);
    const mapped = areas.map((area) => ({
      areaId: area.area_id,
      name: area.name,
      icon: area.icon,
    }));

    return mapped.sort(byName);
  }

  /**
   * Every entity HA has right now, with device, area, labels and its folder: for the flow editor's
   * picker and the entities in the list.
   */
  @Get("entities")
  async entities(): Promise<EntityOption[]> {
    const [states, registry, devices, areas, labels, entityCategories] = await Promise.all([
      this.ha.call<HaState[]>(HA_COMMAND.getStates),
      this.ha.call<HaEntityRegistryEntry[]>(HA_COMMAND.entityRegistryList),
      this.ha.call<HaDevice[]>(HA_COMMAND.deviceRegistryList),
      this.ha.call<HaArea[]>(HA_COMMAND.areaRegistryList),
      this.ha.call<HaLabel[]>(HA_COMMAND.labelRegistryList),
      this.ha.call<HaCategory[]>(HA_COMMAND.categoryRegistryList, {
        scope: CATEGORY_SCOPE.entities,
      }),
    ]);

    return toEntityOptions({ states, registry, devices, areas, labels, entityCategories });
  }

  /** Floors in HA's order (by level, then name), for flows that target a floor. */
  @Get("floors")
  async floors(): Promise<Floor[]> {
    const floors = await this.ha.call<HaFloor[]>(HA_COMMAND.floorRegistryList);
    const level = (floor: HaFloor): number => floor.level ?? Number.MAX_SAFE_INTEGER;
    const sorted = [...floors].sort(
      (first, second) => level(first) - level(second) || byName(first, second),
    );

    return sorted.map((floor) => ({
      floorId: floor.floor_id,
      name: floor.name,
      icon: floor.icon,
    }));
  }

  /**
   * Dashboard resources that look like icon packs, for the frontend to load when HA has not yet
   * (see icon-resources.ts). Without dashboards set up HA refuses the command: then there are none.
   */
  @Get("icon-packs/resources")
  async iconPackResources(): Promise<string[]> {
    try {
      const resources = await this.ha.call<HaLovelaceResource[]>(HA_COMMAND.lovelaceResources);
      return iconResourceUrls(resources);
    } catch {
      return [];
    }
  }

  @Get("labels")
  async labels(): Promise<Label[]> {
    const labels = await this.ha.call<HaLabel[]>(HA_COMMAND.labelRegistryList);
    const mapped = labels.map((label) => ({
      labelId: label.label_id,
      name: label.name,
      icon: label.icon,
      color: label.color,
    }));

    return mapped.sort(byName);
  }
}
