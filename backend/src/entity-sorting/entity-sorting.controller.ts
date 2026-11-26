import { Body, Controller, Get, HttpCode, HttpStatus, Post, Put } from "@nestjs/common";

import { ResponseMessage } from "../common/api/response-message.decorator";
import { MESSAGE_ID } from "../messages/message-ids";
import { SortingMemoryDto } from "./dto/sorting-memory.dto";
import { SortingMovesDto, SortingUndoDto } from "./dto/sorting-moves.dto";
import type { EntityMoveResult, SortingContext } from "./entity-sorting.model";
import { EntitySortingService } from "./entity-sorting.service";

/** The tool "Entitäten einsortieren" (docs/api.md). */
@Controller("entity-sorting")
export class EntitySortingController {
  constructor(private readonly sorting: EntitySortingService) {}

  @Get()
  context(): Promise<SortingContext> {
    return this.sorting.context();
  }

  @Put("memory")
  @ResponseMessage(MESSAGE_ID.entitySortingSaved)
  async saveMemory(@Body() dto: SortingMemoryDto): Promise<null> {
    await this.sorting.saveMemory(dto);

    return null;
  }

  /** One batch of an apply; results per entity, a failing one does not fail the request. */
  @Post("moves")
  @HttpCode(HttpStatus.OK)
  @ResponseMessage(MESSAGE_ID.entitySortingMoved)
  moves(@Body() dto: SortingMovesDto): Promise<EntityMoveResult[]> {
    return this.sorting.applyMoves(dto.runId, dto.moves);
  }

  @Post("undo")
  @HttpCode(HttpStatus.OK)
  @ResponseMessage(MESSAGE_ID.entitySortingUndone)
  undo(@Body() dto: SortingUndoDto): Promise<EntityMoveResult[]> {
    return this.sorting.undo(dto.runId, dto.entityIds);
  }
}
