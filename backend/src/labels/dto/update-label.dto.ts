import { IsNotEmpty, IsOptional, IsString, Matches, MaxLength, ValidateIf } from "class-validator";

import {
  LABEL_COLOR_PATTERN,
  LABEL_ICON_PATTERN,
  LABEL_NAME_MAX_LENGTH,
} from "../labels.constants";

/** Missing fields stay as they are; null clears colour or icon. */
export class UpdateLabelDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(LABEL_NAME_MAX_LENGTH)
  name?: string;

  @IsOptional()
  @ValidateIf((dto: UpdateLabelDto) => dto.color !== null)
  @IsString()
  @Matches(LABEL_COLOR_PATTERN)
  color?: string | null;

  @IsOptional()
  @ValidateIf((dto: UpdateLabelDto) => dto.icon !== null)
  @IsString()
  @Matches(LABEL_ICON_PATTERN)
  icon?: string | null;
}
