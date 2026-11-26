import { Body, Controller, Delete, Param, Post } from "@nestjs/common";

import { ResponseMessage } from "src/common/api/response-message.decorator";
import { MESSAGE_ID } from "src/messages/message-ids";
import { CreateFlowDto } from "./dto/create-flow.dto";
import { FlowsService } from "./flows.service";

/** Whole automations and scripts: create empty ones, delete them. */
@Controller("flows")
export class FlowsController {
  constructor(private readonly flowsService: FlowsService) {}

  @Post()
  @ResponseMessage(MESSAGE_ID.flowCreated)
  create(@Body() dto: CreateFlowDto): Promise<{ entityId: string }> {
    return this.flowsService.create({ dto });
  }

  @Delete(":entityId")
  @ResponseMessage(MESSAGE_ID.flowDeleted)
  async delete(@Param("entityId") entityId: string): Promise<null> {
    await this.flowsService.delete(entityId);

    return null;
  }
}
