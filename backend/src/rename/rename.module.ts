import { Module } from "@nestjs/common";

import { EditorModule } from "../editor/editor.module";
import { EntriesModule } from "../entries/entries.module";
import { HaModule } from "../ha/ha.module";
import { OverlayModule } from "../overlay/overlay.module";
import { SnapshotModule } from "../snapshot/snapshot.module";
import { VersionsModule } from "../versions/versions.module";
import { RenameController } from "./rename.controller";
import { RenameService } from "./rename.service";

/** Changing an entity ID together with the flows that name it. */
@Module({
  imports: [HaModule, EntriesModule, EditorModule, OverlayModule, SnapshotModule, VersionsModule],
  controllers: [RenameController],
  providers: [RenameService],
})
export class RenameModule {}
