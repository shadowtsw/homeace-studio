import { Body, Controller, Delete, Get, Param, Patch, Post } from "@nestjs/common";

import { ResponseMessage } from "../common/api/response-message.decorator";
import type { Label } from "../lookups/lookups.controller";
import { MESSAGE_ID } from "../messages/message-ids";
import { CreateLabelDto } from "./dto/create-label.dto";
import { UpdateLabelDto } from "./dto/update-label.dto";
import type { LabelUsage } from "./label-usage";
import { LabelsService } from "./labels.service";

/**
 * HA's labels: create, change, delete, and where one is used (the list is GET /api/labels in
 * lookups).
 */
@Controller("labels")
export class LabelsController {
  constructor(private readonly labels: LabelsService) {}

  @Post()
  @ResponseMessage(MESSAGE_ID.labelCreated)
  create(@Body() dto: CreateLabelDto): Promise<Label> {
    return this.labels.create(dto);
  }

  @Patch(":labelId")
  @ResponseMessage(MESSAGE_ID.labelUpdated)
  update(@Param("labelId") labelId: string, @Body() dto: UpdateLabelDto): Promise<Label> {
    return this.labels.update({ labelId, fields: dto });
  }

  @Delete(":labelId")
  @ResponseMessage(MESSAGE_ID.labelDeleted)
  async delete(@Param("labelId") labelId: string): Promise<null> {
    await this.labels.delete(labelId);
    return null;
  }

  @Get(":labelId/usage")
  usage(@Param("labelId") labelId: string): Promise<LabelUsage> {
    return this.labels.usage(labelId);
  }
}
