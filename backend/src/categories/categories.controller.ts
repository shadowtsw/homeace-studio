import { Body, Controller, HttpCode, HttpStatus, Post } from "@nestjs/common";

import { ResponseMessage } from "src/common/api/response-message.decorator";
import { MESSAGE_ID } from "src/messages/message-ids";
import { CategoriesService } from "./categories.service";
import { RenameCategoryDto } from "./dto/rename-category.dto";

@Controller("categories")
export class CategoriesController {
  constructor(private readonly categoriesService: CategoriesService) {}

  /** An action across many categories, so a POST action instead of a PATCH on one resource. */
  @Post("rename")
  @HttpCode(HttpStatus.OK)
  @ResponseMessage(MESSAGE_ID.categoryRenamed)
  async rename(@Body() dto: RenameCategoryDto): Promise<{ renamedCount: number }> {
    const renamedCount = await this.categoriesService.rename({ from: dto.from, to: dto.to });

    return { renamedCount };
  }
}
