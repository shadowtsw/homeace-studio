import { Body, Controller, Get, HttpCode, HttpStatus, Param, Patch, Post } from "@nestjs/common";

import { ResponseMessage } from "src/common/api/response-message.decorator";
import { MESSAGE_ID } from "src/messages/message-ids";
import { MoveEntryDto } from "./dto/move-entry.dto";
import { UpdateEntryDto } from "./dto/update-entry.dto";
import { UpdateExtrasDto } from "./dto/update-extras.dto";
import { EntriesService } from "./entries.service";
import { ENTRY_ACTION, type Entry, type EntryAction, type EntryDetails } from "./entry.model";

@Controller("entries")
export class EntriesController {
  constructor(private readonly entriesService: EntriesService) {}

  @Get()
  findAll(): Promise<Entry[]> {
    return this.entriesService.findAll();
  }

  /** Registry fields the list does not carry (aliases). */
  @Get(":entityId/details")
  details(@Param("entityId") entityId: string): Promise<EntryDetails> {
    return this.entriesService.details(entityId);
  }

  /** Name, icon, area, labels, aliases, hidden, disabled (HA's entity registry). */
  @Patch(":entityId")
  @ResponseMessage(MESSAGE_ID.entryUpdated)
  update(@Param("entityId") entityId: string, @Body() dto: UpdateEntryDto): Promise<Entry> {
    return this.entriesService.update({ entityId, changes: dto });
  }

  /** Favorite and note (overlay only). */
  @Patch(":entityId/extras")
  @ResponseMessage(MESSAGE_ID.entryExtrasSaved)
  async updateExtras(
    @Param("entityId") entityId: string,
    @Body() dto: UpdateExtrasDto,
  ): Promise<null> {
    await this.entriesService.updateExtras({ entityId, extras: dto });

    return null;
  }

  /** Moving is an action on the entry (it may create and delete HA categories on the way). */
  @Post(":entityId/move")
  @HttpCode(HttpStatus.OK)
  @ResponseMessage(MESSAGE_ID.entryMoved)
  async move(@Param("entityId") entityId: string, @Body() dto: MoveEntryDto): Promise<null> {
    await this.entriesService.moveToCategory({ entityId, categoryPath: dto.categoryPath });

    return null;
  }

  @Post(":entityId/run")
  @HttpCode(HttpStatus.OK)
  @ResponseMessage(MESSAGE_ID.entryActionDone)
  run(@Param("entityId") entityId: string): Promise<null> {
    return this.act({ entityId, action: ENTRY_ACTION.run });
  }

  @Post(":entityId/turn-on")
  @HttpCode(HttpStatus.OK)
  @ResponseMessage(MESSAGE_ID.entryActionDone)
  turnOn(@Param("entityId") entityId: string): Promise<null> {
    return this.act({ entityId, action: ENTRY_ACTION.turnOn });
  }

  @Post(":entityId/turn-off")
  @HttpCode(HttpStatus.OK)
  @ResponseMessage(MESSAGE_ID.entryActionDone)
  turnOff(@Param("entityId") entityId: string): Promise<null> {
    return this.act({ entityId, action: ENTRY_ACTION.turnOff });
  }

  private async act({
    entityId,
    action,
  }: {
    entityId: string;
    action: EntryAction;
  }): Promise<null> {
    await this.entriesService.runAction({ entityId, action });

    return null;
  }
}
