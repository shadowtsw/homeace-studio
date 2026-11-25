import { IsNotEmpty, IsOptional, IsString, Matches, MaxLength, ValidateIf } from "class-validator";

import {
  LABEL_COLOR_PATTERN,
  LABEL_ICON_PATTERN,
  LABEL_NAME_MAX_LENGTH,
} from "../labels.constants";

export class CreateLabelDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(LABEL_NAME_MAX_LENGTH)
  name!: string;

  /** One of HA's colour names ("indigo") or a hex value; null or missing: no colour. */
  @IsOptional()
  @ValidateIf((dto: CreateLabelDto) => dto.color !== null)
  @IsString()
  @Matches(LABEL_COLOR_PATTERN)
  color?: string | null;

  /** "mdi:lightbulb"; null or missing: no icon. */
  @IsOptional()
  @ValidateIf((dto: CreateLabelDto) => dto.icon !== null)
  @IsString()
  @Matches(LABEL_ICON_PATTERN)
  icon?: string | null;
}
