import { Injectable, Logger } from "@nestjs/common";

import { CATEGORY_SCOPE } from "../../categories/categories.constants";
import { HaConnectionService } from "../../ha/ha-connection.service";
import { HA_COMMAND } from "../../ha/ha.constants";
import type { HaCategory, HaFloor, HaLabel, HaManifest } from "../../ha/ha.types";
import type { SortingSourcesRepository } from "./sorting-sources.repository";

@Injectable()
export class HaSortingSourcesRepository implements SortingSourcesRepository {
  private readonly logger = new Logger(HaSortingSourcesRepository.name);

  constructor(private readonly ha: HaConnectionService) {}

  floors(): Promise<HaFloor[]> {
    return this.ha.call<HaFloor[]>(HA_COMMAND.floorRegistryList);
  }

  labels(): Promise<HaLabel[]> {
    return this.ha.call<HaLabel[]>(HA_COMMAND.labelRegistryList);
  }

  entityCategories(): Promise<HaCategory[]> {
    return this.ha.call<HaCategory[]>(HA_COMMAND.categoryRegistryList, {
      scope: CATEGORY_SCOPE.entities,
    });
  }

  /** Names only make proposals nicer; without them the tool still works with the domains. */
  async integrationNames(): Promise<Record<string, string>> {
    try {
      const manifests = await this.ha.call<HaManifest[]>(HA_COMMAND.manifestList);

      return Object.fromEntries(manifests.map((manifest) => [manifest.domain, manifest.name]));
    } catch (error) {
      this.logger.warn(`Integration names not available: ${String(error)}`);
      return {};
    }
  }
}
