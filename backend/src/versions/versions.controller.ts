import {
  Body,
  Controller,
  Get,
  Headers,
  HttpCode,
  HttpStatus,
  NotFoundException,
  Param,
  Post,
  Put,
} from "@nestjs/common";
import type { IncomingHttpHeaders } from "node:http";

import { apiError } from "src/common/api/api-response";
import { ResponseMessage } from "src/common/api/response-message.decorator";
import { MESSAGE_ID } from "src/messages/message-ids";
import { haUserFrom } from "../preferences/ha-user";
import { NameVersionDto } from "./dto/name-version.dto";
import { VERSION_KIND, type VersionKind } from "./versions.model";
import {
  VersionsService,
  type RestoreResult,
  type TrashItem,
  type VersionsView,
} from "./versions.service";

function isVersionKind(value: string): value is VersionKind {
  return Object.values<string>(VERSION_KIND).includes(value);
}

/**
 * Earlier versions of automations, scripts and scenes (docs/api.md). Only through the app's API:
 * versions hold whole configs and are never offered over the AI access (MCP).
 */
@Controller("versions")
export class VersionsController {
  constructor(private readonly versions: VersionsService) {}

  /** Deleted automations, scripts and scenes, kept for 30 days ("Kürzlich gelöscht"). */
  @Get("trash")
  trash(): Promise<TrashItem[]> {
    return this.versions.trash();
  }

  @Post("trash/:kind/:key/restore")
  @HttpCode(HttpStatus.OK)
  @ResponseMessage(MESSAGE_ID.trashRestored)
  restoreFromTrash(
    @Headers() headers: IncomingHttpHeaders,
    @Param("kind") kind: string,
    @Param("key") key: string,
  ): Promise<{ entityId: string; name: string }> {
    if (!isVersionKind(kind)) {
      throw new NotFoundException(
        apiError({ message: MESSAGE_ID.trashNotFound, details: { params: { key } } }),
      );
    }
    const user = haUserFrom(headers) ?? undefined;
    return this.versions.restoreFromTrash({ kind, key, user });
  }

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
    return this.versions.name({
      entityId,
      versionId,
      name: dto.name ?? null,
      confirmDrop: dto.confirmDrop === true,
    });
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
