import { Type } from "class-transformer";
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsIn,
  IsNotEmpty,
  IsString,
  MaxLength,
  ValidateIf,
  ValidateNested,
} from "class-validator";

import { CATEGORY_PATH_MAX_LENGTH } from "../../categories/categories.constants";
import {
  KEY_MAX_LENGTH,
  MAX_IGNORED,
  MAX_REJECTIONS,
  MAX_RULE_CONDITIONS,
  MAX_RULES,
  VALUE_MAX_LENGTH,
} from "../entity-sorting.constants";
import { SORTING_CONDITION_TYPE, type SortingConditionType } from "../entity-sorting.model";

export class SortingConditionDto {
  @IsIn(Object.values(SORTING_CONDITION_TYPE))
  type!: SortingConditionType;

  @IsString()
  @IsNotEmpty()
  @MaxLength(VALUE_MAX_LENGTH)
  value!: string;
}

export class SortingRuleDto {
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(MAX_RULE_CONDITIONS)
  @ValidateNested({ each: true })
  @Type(() => SortingConditionDto)
  conditions!: SortingConditionDto[];

  /** A folder path, may hold `{area}` and `{floor}`. */
  @IsString()
  @IsNotEmpty()
  @MaxLength(CATEGORY_PATH_MAX_LENGTH)
  target!: string;
}

export class SortingRejectionDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(KEY_MAX_LENGTH)
  bundleKey!: string;

  @IsArray()
  @ArrayMaxSize(MAX_RULES)
  @IsString({ each: true })
  @MaxLength(CATEGORY_PATH_MAX_LENGTH, { each: true })
  paths!: string[];
}

export class SortingMemoryDto {
  @IsArray()
  @ArrayMaxSize(MAX_RULES)
  @ValidateNested({ each: true })
  @Type(() => SortingRuleDto)
  rules!: SortingRuleDto[];

  @IsArray()
  @ArrayMaxSize(MAX_REJECTIONS)
  @ValidateNested({ each: true })
  @Type(() => SortingRejectionDto)
  rejected!: SortingRejectionDto[];

  @IsArray()
  @ArrayMaxSize(MAX_IGNORED)
  @IsString({ each: true })
  @MaxLength(KEY_MAX_LENGTH, { each: true })
  ignored!: string[];

  /** "" for the top level, a folder path, or null to let the tool pick. */
  @ValidateIf((dto: SortingMemoryDto) => dto.areaParent !== null)
  @IsString()
  @MaxLength(CATEGORY_PATH_MAX_LENGTH)
  areaParent!: string | null;
}
