import { Module } from "@nestjs/common";

import { EditorModule } from "../editor/editor.module";
import { EntriesModule } from "../entries/entries.module";
import { HelpersModule } from "../helpers/helpers.module";
import { DuplicateController } from "./duplicate.controller";
import { DuplicateService } from "./duplicate.service";

/** Duplicating automations, scripts and storage helpers with their folder, labels and area. */
@Module({
  imports: [EditorModule, EntriesModule, HelpersModule],
  controllers: [DuplicateController],
  providers: [DuplicateService],
})
export class DuplicateModule {}
