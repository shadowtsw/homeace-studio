import { Body, Controller, Delete, Get, Post, Put, Query } from "@nestjs/common";

import { ResponseMessage } from "src/common/api/response-message.decorator";
import { MESSAGE_ID } from "src/messages/message-ids";
import { CreateFolderDto } from "./dto/create-folder.dto";
import { SetFolderColorDto } from "./dto/set-folder-color.dto";
import { SetFolderOrderDto } from "./dto/set-folder-order.dto";
import { FoldersService, type FolderOverview } from "./folders.service";

/** Empty folders of the tree (overlay only; HA has no empty categories). */
@Controller("folders")
export class FoldersController {
  constructor(private readonly foldersService: FoldersService) {}

  @Get()
  findAll(): Promise<FolderOverview> {
    return this.foldersService.findAll();
  }

  /** Replaces the own order of a folder's subfolders (PUT: the list is set as a whole). */
  @Put("order")
  @ResponseMessage(MESSAGE_ID.folderOrderSaved)
  async setOrder(@Body() dto: SetFolderOrderDto): Promise<null> {
    await this.foldersService.setOrder({ parent: dto.parent, order: dto.order });

    return null;
  }

  /** Replaces the color of one folder (PUT: the color is set as a whole, or removed with null). */
  @Put("color")
  @ResponseMessage(MESSAGE_ID.folderColorSaved)
  async setColor(@Body() dto: SetFolderColorDto): Promise<null> {
    await this.foldersService.setColor({ path: dto.path, color: dto.color });

    return null;
  }

  @Post()
  @ResponseMessage(MESSAGE_ID.folderCreated)
  async create(@Body() dto: CreateFolderDto): Promise<{ path: string }> {
    const path = await this.foldersService.create(dto.path);

    return { path };
  }

  /** The path goes in the query, because folder paths contain "/". */
  @Delete()
  @ResponseMessage(MESSAGE_ID.folderDeleted)
  async delete(@Query("path") path = ""): Promise<null> {
    await this.foldersService.delete(path);

    return null;
  }
}
