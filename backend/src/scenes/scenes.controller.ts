import { Body, Controller, Get, HttpCode, HttpStatus, Param, Post, Put } from "@nestjs/common";

import { ResponseMessage } from "src/common/api/response-message.decorator";
import { MESSAGE_ID } from "src/messages/message-ids";
import { RestoreSceneDto } from "./dto/restore-scene.dto";
import { SceneEntitiesDto } from "./dto/scene-entities.dto";
import type { SceneDevice, SceneView } from "./scene.model";
import { ScenesService } from "./scenes.service";

@Controller("scenes")
export class ScenesController {
  constructor(private readonly scenes: ScenesService) {}

  /** A device as it would join a scene, with its current state as the starting values. */
  @Get("device/:deviceId")
  candidate(@Param("deviceId") deviceId: string): Promise<SceneDevice> {
    return this.scenes.candidate(deviceId);
  }

  @Get(":entityId")
  get(@Param("entityId") entityId: string): Promise<SceneView> {
    return this.scenes.get(entityId);
  }

  @Put(":entityId")
  @ResponseMessage(MESSAGE_ID.sceneSaved)
  save(@Param("entityId") entityId: string, @Body() dto: SceneEntitiesDto): Promise<SceneView> {
    return this.scenes.save(entityId, dto.entities);
  }

  @Post(":entityId/preview")
  @HttpCode(HttpStatus.OK)
  @ResponseMessage(MESSAGE_ID.scenePreviewShown)
  async preview(@Param("entityId") entityId: string, @Body() dto: SceneEntitiesDto): Promise<null> {
    await this.scenes.preview(entityId, dto.entities);
    return null;
  }

  @Post(":entityId/restore")
  @HttpCode(HttpStatus.OK)
  @ResponseMessage(MESSAGE_ID.sceneRestored)
  async restore(@Param("entityId") entityId: string, @Body() dto: RestoreSceneDto): Promise<null> {
    await this.scenes.restore(entityId, dto.entityIds);
    return null;
  }
}
