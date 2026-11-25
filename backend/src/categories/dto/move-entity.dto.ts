import { IsNotEmpty, IsString, MaxLength, ValidateIf } from "class-validator";

import { CATEGORY_PATH_MAX_LENGTH } from "../categories.constants";

export class MoveEntityDto {
  /** Target folder like "Haus/Terrasse"; null takes the entity out of its folder. */
  @ValidateIf((dto: MoveEntityDto) => dto.categoryPath !== null)
  @IsString()
  @IsNotEmpty()
  @MaxLength(CATEGORY_PATH_MAX_LENGTH)
  categoryPath!: string | null;
}
