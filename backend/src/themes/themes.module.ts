import { Module } from "@nestjs/common";

import { OverlayModule } from "../overlay/overlay.module";
import { ThemesController } from "./themes.controller";
import { ThemesService } from "./themes.service";

/** Own themes per HA user, checked with the same rules as in the browser (core/themes). */
@Module({
  imports: [OverlayModule],
  controllers: [ThemesController],
  providers: [ThemesService],
})
export class ThemesModule {}
