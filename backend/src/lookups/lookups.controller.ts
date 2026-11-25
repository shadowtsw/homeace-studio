import { Controller, Get } from "@nestjs/common";

import { CATEGORY_SCOPE } from "../categories/categories.constants";
import { HaConnectionService } from "../ha/ha-connection.service";
import { HA_COMMAND } from "../ha/ha.constants";
import type {
  HaArea,
  HaCategory,
  HaDevice,
  HaEntityRegistryEntry,
  HaLabel,
  HaState,
} from "../ha/ha.types";
import { toEntityOptions, type EntityOption } from "./entity-options";

export type Area = { areaId: string; name: string; icon: string | null };
export type Label = { labelId: string; name: string; icon: string | null; color: string | null };

const byName = (first: { name: string }, second: { name: string }): number =>
  first.name.localeCompare(second.name, undefined, { sensitivity: "base" });

/**
 * HA's areas, labels and entities, for the pickers in the detail view and the flow editor. Read-only and a plain mapping, so the
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
