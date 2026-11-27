import { Body, Controller, Delete, Get, Headers, Param, Post, Put } from "@nestjs/common";
import type { IncomingHttpHeaders } from "node:http";

import type { OwnThemeRecord } from "../core/themes/ownThemes";
import { haUserFrom } from "../preferences/ha-user";
import { CreateThemeDto } from "./dto/create-theme.dto";
import { ThemesService, type CreatedTheme } from "./themes.service";

/**
 * Own themes per HA user (docs/api.md). The user comes from HA's ingress headers, never from the
 * request body, so nobody can read or change another user's themes.
 */
@Controller("themes")
export class ThemesController {
  constructor(private readonly themes: ThemesService) {}

  @Get()
  list(@Headers() headers: IncomingHttpHeaders): Promise<OwnThemeRecord[]> {
    return this.themes.list(haUserFrom(headers));
  }

  @Post()
  create(
    @Headers() headers: IncomingHttpHeaders,
    @Body() dto: CreateThemeDto,
  ): Promise<CreatedTheme> {
    return this.themes.create({ user: haUserFrom(headers), theme: dto.theme });
  }

  /** The editor saved an own theme; it is checked again and keeps its id. */
  @Put(":id")
  update(
    @Headers() headers: IncomingHttpHeaders,
    @Param("id") id: string,
    @Body() dto: CreateThemeDto,
  ): Promise<OwnThemeRecord[]> {
    return this.themes.update({ user: haUserFrom(headers), id, theme: dto.theme });
  }

  @Delete(":id")
  remove(
    @Headers() headers: IncomingHttpHeaders,
    @Param("id") id: string,
  ): Promise<OwnThemeRecord[]> {
    return this.themes.remove({ user: haUserFrom(headers), id });
  }
}
