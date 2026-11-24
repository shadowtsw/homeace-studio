import { Module } from "@nestjs/common";

import { CategoriesModule } from "../categories/categories.module";
import { wait } from "../common/utils/wait";
import { HaModule } from "../ha/ha.module";
import { OverlayModule } from "../overlay/overlay.module";
import { HelpersController } from "./helpers.controller";
import { ENTITY_LOOKUP_WAIT, HELPER_REPOSITORY } from "./helpers.constants";
import { HelpersService } from "./helpers.service";
import { HaHelpersRepository } from "./repositories/ha-helpers.repository";

@Module({
  imports: [HaModule, OverlayModule, CategoriesModule],
  controllers: [HelpersController],
  providers: [
    HelpersService,
    { provide: HELPER_REPOSITORY, useClass: HaHelpersRepository },
    { provide: ENTITY_LOOKUP_WAIT, useValue: wait },
  ],
  exports: [HelpersService],
})
export class HelpersModule {}
