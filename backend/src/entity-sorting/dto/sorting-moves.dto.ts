import { Type } from "class-transformer";
import {
  ArrayMaxSize,
  IsArray,
  IsNotEmpty,
  IsString,
  MaxLength,
  ValidateIf,
  ValidateNested,
} from "class-validator";

import { CATEGORY_PATH_MAX_LENGTH } from "../../categories/categories.constants";
import { KEY_MAX_LENGTH, MAX_MOVES_PER_BATCH } from "../entity-sorting.constants";

export class SortingMoveDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(KEY_MAX_LENGTH)
  entityId!: string;

  /** Target folder; null takes the entity out of its folder. */
  @ValidateIf((dto: SortingMoveDto) => dto.categoryPath !== null)
  @IsString()
  @IsNotEmpty()
  @MaxLength(CATEGORY_PATH_MAX_LENGTH)
  categoryPath!: string | null;
}

export class SortingMovesDto {
  /** Chosen by the browser once per apply; all its batches share it. */
  @IsString()
  @IsNotEmpty()
  @MaxLength(KEY_MAX_LENGTH)
  runId!: string;

  @IsArray()
  @ArrayMaxSize(MAX_MOVES_PER_BATCH)
  @ValidateNested({ each: true })
  @Type(() => SortingMoveDto)
  moves!: SortingMoveDto[];
}

export class SortingUndoDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(KEY_MAX_LENGTH)
  runId!: string;

  @IsArray()
  @ArrayMaxSize(MAX_MOVES_PER_BATCH)
  @IsString({ each: true })
  @MaxLength(KEY_MAX_LENGTH, { each: true })
  entityIds!: string[];
}
