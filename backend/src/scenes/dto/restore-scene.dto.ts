import { ArrayMaxSize, IsArray, IsOptional, IsString } from "class-validator";

import { SCENE_MAX_DEVICES } from "../scenes.constants";

export class RestoreSceneDto {
  /** Devices to bring back; omitted or empty for all of the scene's previewed devices. */
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(SCENE_MAX_DEVICES)
  @IsString({ each: true })
  entityIds?: string[];
}
