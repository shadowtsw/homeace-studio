import { Body, Controller, Delete, Param, Patch, Post } from "@nestjs/common";

import { ResponseMessage } from "../common/api/response-message.decorator";
import type { Area } from "../lookups/lookups.controller";
import { MESSAGE_ID } from "../messages/message-ids";
import { AreasService } from "./areas.service";
import { CreateAreaDto } from "./dto/create-area.dto";
import { UpdateAreaDto } from "./dto/update-area.dto";

/** HA's areas: create, change, delete (the list is GET /api/areas in lookups). */
@Controller("areas")
export class AreasController {
  constructor(private readonly areas: AreasService) {}

  @Post()
  @ResponseMessage(MESSAGE_ID.areaCreated)
  create(@Body() dto: CreateAreaDto): Promise<Area> {
    return this.areas.create({ name: dto.name, icon: dto.icon ?? null });
  }

  @Patch(":areaId")
  @ResponseMessage(MESSAGE_ID.areaUpdated)
  update(@Param("areaId") areaId: string, @Body() dto: UpdateAreaDto): Promise<Area> {
    return this.areas.update({ areaId, changes: dto });
  }

  @Delete(":areaId")
  @ResponseMessage(MESSAGE_ID.areaDeleted)
  async delete(@Param("areaId") areaId: string): Promise<null> {
    await this.areas.delete(areaId);
    return null;
  }
}
