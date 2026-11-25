import { Module } from "@nestjs/common";

import { PreferencesController } from "./preferences.controller";

/** Settings per HA user: who is there, and later their kept values in the overlay. */
@Module({
  controllers: [PreferencesController],
})
export class PreferencesModule {}
