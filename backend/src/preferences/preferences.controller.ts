import { Body, Controller, Get, Headers, Param, Post, Put } from "@nestjs/common";
import type { IncomingHttpHeaders } from "node:http";

import type { UserPreferences } from "../overlay/overlay.model";
import { ImportPreferencesDto } from "./dto/import-preferences.dto";
import { SetPreferenceDto } from "./dto/set-preference.dto";
import { haUserFrom } from "./ha-user";
import { PreferencesService, type PreferencesAnswer } from "./preferences.service";

/**
 * Settings per HA user (docs/api.md). The user comes from HA's ingress headers, never from the
 * request body, so nobody can write another user's settings.
 */
@Controller("preferences")
export class PreferencesController {
  constructor(private readonly preferences: PreferencesService) {}

  @Get()
  read(@Headers() headers: IncomingHttpHeaders): Promise<PreferencesAnswer> {
    return this.preferences.read(haUserFrom(headers));
  }

  /** First visit through HA: this browser's values become the user's, unless they have some. */
  @Post("import")
  importFirst(
    @Headers() headers: IncomingHttpHeaders,
    @Body() dto: ImportPreferencesDto,
  ): Promise<UserPreferences> {
    return this.preferences.importFirst(haUserFrom(headers), dto.values);
  }

  @Put(":name")
  set(
    @Headers() headers: IncomingHttpHeaders,
    @Param("name") name: string,
    @Body() dto: SetPreferenceDto,
  ): Promise<UserPreferences> {
    return this.preferences.set(haUserFrom(headers), name, dto.value);
  }
}
