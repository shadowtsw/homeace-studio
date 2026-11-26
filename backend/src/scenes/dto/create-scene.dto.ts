import { IsNotEmpty, IsOptional, IsString, MaxLength } from "class-validator";

import { CATEGORY_PATH_MAX_LENGTH } from "../../categories/categories.constants";
import { FLOW_NAME_MAX_LENGTH } from "../../editor/editor.constants";

export class CreateSceneDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(FLOW_NAME_MAX_LENGTH)
  name!: string;

  /** Folder to put the new scene in, e.g. "Haus/Terrasse"; omitted or null for none. */
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(CATEGORY_PATH_MAX_LENGTH)
  categoryPath?: string | null;
}
