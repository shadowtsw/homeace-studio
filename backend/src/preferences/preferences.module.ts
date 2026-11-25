import { Module } from "@nestjs/common";

import { OverlayModule } from "../overlay/overlay.module";
import { PreferencesController } from "./preferences.controller";
import { PreferencesService } from "./preferences.service";

/** Settings per HA user: who is there, and their kept values in the overlay. */
@Module({
  imports: [OverlayModule],
  controllers: [PreferencesController],
  providers: [PreferencesService],
})
export class PreferencesModule {}
