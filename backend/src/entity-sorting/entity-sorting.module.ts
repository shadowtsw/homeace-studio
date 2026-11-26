import { Module } from "@nestjs/common";

import { CategoriesModule } from "../categories/categories.module";
import { DependenciesModule } from "../dependencies/dependencies.module";
import { HaModule } from "../ha/ha.module";
import { OverlayModule } from "../overlay/overlay.module";
import { SnapshotModule } from "../snapshot/snapshot.module";
import { SORTING_SOURCES_REPOSITORY } from "./entity-sorting.constants";
import { EntitySortingController } from "./entity-sorting.controller";
import { EntitySortingService } from "./entity-sorting.service";
import { HaSortingSourcesRepository } from "./repositories/ha-sorting-sources.repository";

/** The tool "Entitäten einsortieren": proposals are computed in the browser, this serves the data. */
@Module({
  imports: [HaModule, OverlayModule, SnapshotModule, DependenciesModule, CategoriesModule],
  controllers: [EntitySortingController],
  providers: [
    EntitySortingService,
    { provide: SORTING_SOURCES_REPOSITORY, useClass: HaSortingSourcesRepository },
  ],
})
export class EntitySortingModule {}
