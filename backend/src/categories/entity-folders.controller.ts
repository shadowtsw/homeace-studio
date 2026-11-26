import { Body, Controller, HttpCode, HttpStatus, Param, Post } from "@nestjs/common";

import { ResponseMessage } from "src/common/api/response-message.decorator";
import { MESSAGE_ID } from "src/messages/message-ids";
import { CategoriesService } from "./categories.service";
import { MoveEntityDto } from "./dto/move-entity.dto";

/** Folders for plain entities; reading them is part of `GET /api/entities` (lookups). */
@Controller("entities")
export class EntityFoldersController {
  constructor(private readonly categoriesService: CategoriesService) {}

  /** Like moving an entry: an action that may create and delete HA categories on the way. */
  @Post(":entityId/move")
  @HttpCode(HttpStatus.OK)
  @ResponseMessage(MESSAGE_ID.entryMoved)
  async move(@Param("entityId") entityId: string, @Body() dto: MoveEntityDto): Promise<null> {
    await this.categoriesService.moveEntity({ entityId, targetPath: dto.categoryPath });

    return null;
  }
}
