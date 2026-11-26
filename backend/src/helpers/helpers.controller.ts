import { Body, Controller, Delete, Get, Param, Post, Put } from "@nestjs/common";

import { ResponseMessage } from "src/common/api/response-message.decorator";
import { MESSAGE_ID } from "src/messages/message-ids";
import { CreateHelperDto } from "./dto/create-helper.dto";
import { UpdateHelperSettingsDto } from "./dto/update-helper-settings.dto";
import { HelpersService, type HelperSettingsView } from "./helpers.service";

@Controller("helpers")
export class HelpersController {
  constructor(private readonly helpersService: HelpersService) {}

  @Post()
  @ResponseMessage(MESSAGE_ID.helperCreated)
  create(@Body() dto: CreateHelperDto): Promise<{ entityId: string }> {
    return this.helpersService.create(dto);
  }

  @Get(":entityId/settings")
  settings(@Param("entityId") entityId: string): Promise<HelperSettingsView> {
    return this.helpersService.settings(entityId);
  }

  @Put(":entityId/settings")
  @ResponseMessage(MESSAGE_ID.helperSettingsSaved)
  updateSettings(
    @Param("entityId") entityId: string,
    @Body() dto: UpdateHelperSettingsDto,
  ): Promise<HelperSettingsView> {
    return this.helpersService.updateSettings({ entityId, settings: dto.settings });
  }

  @Delete(":entityId")
  @ResponseMessage(MESSAGE_ID.helperDeleted)
  async delete(@Param("entityId") entityId: string): Promise<null> {
    await this.helpersService.delete(entityId);

    return null;
  }
}
