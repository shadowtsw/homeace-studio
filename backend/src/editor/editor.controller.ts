import { Body, Controller, Get, Param, Put, Query } from "@nestjs/common";

import { ResponseMessage } from "src/common/api/response-message.decorator";
import { MESSAGE_ID } from "src/messages/message-ids";
import { SaveFlowDto } from "./dto/save-flow.dto";
import type { EditorCatalog, Flow } from "./editor.model";
import { EditorService } from "./editor.service";

@Controller("editor")
export class EditorController {
  constructor(private readonly editorService: EditorService) {}

  /** All trigger, condition and action types with translated names and their fields. */
  @Get("catalog")
  catalog(@Query("lang") language?: string): Promise<EditorCatalog> {
    return this.editorService.getCatalog({ language });
  }

  /** The config of an automation or script, with names of the entities it mentions. */
  @Get("flows/:entityId")
  flow(@Param("entityId") entityId: string): Promise<Flow> {
    return this.editorService.getFlow(entityId);
  }

  /** Replaces the whole config; PUT because the client always sends the complete flow. */
  @Put("flows/:entityId")
  @ResponseMessage(MESSAGE_ID.flowSaved)
  save(@Param("entityId") entityId: string, @Body() dto: SaveFlowDto): Promise<Flow> {
    return this.editorService.saveFlow({ entityId, config: dto.config });
  }
}
