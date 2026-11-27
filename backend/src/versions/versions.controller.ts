import {
  Body,
  Controller,
  Get,
  Headers,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Put,
} from "@nestjs/common";
import type { IncomingHttpHeaders } from "node:http";

import { ResponseMessage } from "src/common/api/response-message.decorator";
import { MESSAGE_ID } from "src/messages/message-ids";
import { haUserFrom } from "../preferences/ha-user";
import { NameVersionDto } from "./dto/name-version.dto";
import { VersionsService, type RestoreResult, type VersionsView } from "./versions.service";

/**
 * Earlier versions of automations, scripts and scenes (docs/api.md). Only through the app's API:
 * versions hold whole configs and are never offered over the AI access (MCP).
 */
@Controller("versions")
export class VersionsController {
  constructor(private readonly versions: VersionsService) {}

  @Get(":entityId")
  list(@Param("entityId") entityId: string): Promise<VersionsView> {
    return this.versions.list(entityId);
  }

  @Put(":entityId/:versionId/name")
  @ResponseMessage(MESSAGE_ID.versionSaved)
  name(
    @Param("entityId") entityId: string,
    @Param("versionId") versionId: string,
    @Body() dto: NameVersionDto,
  ): Promise<VersionsView> {
    return this.versions.name({ entityId, versionId, name: dto.name ?? null });
  }

  @Post(":entityId/close")
  @HttpCode(HttpStatus.OK)
  @ResponseMessage(MESSAGE_ID.versionClosed)
  close(@Param("entityId") entityId: string): Promise<VersionsView> {
    return this.versions.closeOpen(entityId);
  }

  @Post(":entityId/:versionId/restore")
  @HttpCode(HttpStatus.OK)
  @ResponseMessage(MESSAGE_ID.versionRestored)
  restore(
    @Headers() headers: IncomingHttpHeaders,
    @Param("entityId") entityId: string,
    @Param("versionId") versionId: string,
  ): Promise<RestoreResult> {
    const user = haUserFrom(headers) ?? undefined;
    return this.versions.restore({ entityId, versionId, user });
  }
}
