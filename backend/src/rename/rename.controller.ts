import { Body, Controller, Get, Param, Post } from "@nestjs/common";

import { ResponseMessage } from "../common/api/response-message.decorator";
import { MESSAGE_ID } from "../messages/message-ids";
import { RenameEntityDto } from "./dto/rename-entity.dto";
import { RenameService, type EntityReference, type RenameResult } from "./rename.service";

/** Changing an entity ID, with a look at the places that name it first (docs/api.md). */
@Controller("entries")
export class RenameController {
  constructor(private readonly rename: RenameService) {}

  @Get(":entityId/references")
  references(@Param("entityId") entityId: string): Promise<EntityReference[]> {
    return this.rename.references(entityId);
  }

  /** A rename is an action on the entry: it may rewrite several flows on the way. */
  @Post(":entityId/rename")
  @ResponseMessage(MESSAGE_ID.entryRenamed)
  renameEntity(
    @Param("entityId") entityId: string,
    @Body() dto: RenameEntityDto,
  ): Promise<RenameResult> {
    return this.rename.rename({
      entityId,
      newEntityId: dto.newEntityId,
      withReferences: dto.withReferences,
    });
  }
}
