import { Body, Controller, Param, Post } from "@nestjs/common";

import { ResponseMessage } from "../common/api/response-message.decorator";
import { MESSAGE_ID } from "../messages/message-ids";
import { DuplicateEntryDto } from "./dto/duplicate-entry.dto";
import { DuplicateService } from "./duplicate.service";

/** Copies an automation or script with folder, labels and area (docs/api.md). */
@Controller("entries")
export class DuplicateController {
  constructor(private readonly duplicates: DuplicateService) {}

  @Post(":entityId/duplicate")
  @ResponseMessage(MESSAGE_ID.entryDuplicated)
  duplicate(
    @Param("entityId") entityId: string,
    @Body() dto: DuplicateEntryDto,
  ): Promise<{ entityId: string }> {
    return this.duplicates.duplicate({ entityId, name: dto.name.trim() });
  }
}
