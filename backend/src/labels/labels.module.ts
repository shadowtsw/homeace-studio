import { Module } from "@nestjs/common";

import { HaModule } from "../ha/ha.module";
import { SnapshotModule } from "../snapshot/snapshot.module";
import { LabelsController } from "./labels.controller";
import { LabelsService } from "./labels.service";

/** Labels: create, change and delete them, and where one is used before it goes. */
@Module({
  imports: [HaModule, SnapshotModule],
  controllers: [LabelsController],
  providers: [LabelsService],
})
export class LabelsModule {}
