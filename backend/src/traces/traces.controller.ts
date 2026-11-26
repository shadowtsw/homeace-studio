import { Body, Controller, Get, Param, Put } from "@nestjs/common";

import { ResponseMessage } from "../common/api/response-message.decorator";
import { MESSAGE_ID } from "../messages/message-ids";
import { KeepRunsDto } from "./dto/keep-runs.dto";
import type { RunHistory } from "./traces.model";
import { TracesService } from "./traces.service";

/** Run history of automations and scripts (docs/api.md). */
@Controller("traces")
export class TracesController {
  constructor(private readonly traces: TracesService) {}

  @Get(":entityId")
  forEntity(@Param("entityId") entityId: string): Promise<RunHistory> {
    return this.traces.forEntity(entityId);
  }

  /** How many runs HA keeps (PUT: the number is set as a whole). */
  @Put(":entityId/stored")
  @ResponseMessage(MESSAGE_ID.tracesKept)
  keepRuns(
    @Param("entityId") entityId: string,
    @Body() dto: KeepRunsDto,
  ): Promise<{ storedTraces: number }> {
    return this.traces.keepRuns({ entityId, count: dto.count });
  }
}
