import { Body, Controller, Get, HttpCode, HttpStatus, Param, Post, Put } from "@nestjs/common";
import { ArrayMaxSize, IsArray, IsBoolean, IsString, MaxLength } from "class-validator";

import { ResponseMessage } from "src/common/api/response-message.decorator";
import { MESSAGE_ID } from "src/messages/message-ids";
import type { AiPlanView } from "./ai-plan-rules";
import { AiPlansService, type ApplyResult } from "./ai-plans.service";
import { MAX_PLAN_OPERATIONS } from "./ai.constants";
import { McpAccessService, type McpOverview } from "./mcp-access.service";

const OPERATION_ID_MAX_LENGTH = 16;

export class SetMcpAccessDto {
  @IsBoolean()
  isEnabled!: boolean;
}

export class ApplyPlanDto {
  /** The operations the user kept ticked. */
  @IsArray()
  @ArrayMaxSize(MAX_PLAN_OPERATIONS)
  @IsString({ each: true })
  @MaxLength(OPERATION_ID_MAX_LENGTH, { each: true })
  operationIds!: string[];
}

/** The UI side of the AI access (behind HA ingress); the AI itself talks to the MCP port. */
@Controller()
export class AiController {
  constructor(
    private readonly access: McpAccessService,
    private readonly plans: AiPlansService,
  ) {}

  @Get("mcp")
  overview(): Promise<McpOverview> {
    return this.access.overview();
  }

  @Put("mcp")
  @ResponseMessage(MESSAGE_ID.mcpSaved)
  setEnabled(@Body() dto: SetMcpAccessDto): Promise<McpOverview> {
    return this.access.setEnabled(dto.isEnabled);
  }

  @Post("mcp/token")
  @HttpCode(HttpStatus.OK)
  @ResponseMessage(MESSAGE_ID.mcpTokenRenewed)
  renewToken(): Promise<McpOverview> {
    return this.access.renewToken();
  }

  @Get("ai-plans")
  list(): Promise<AiPlanView[]> {
    return this.plans.list();
  }

  @Post("ai-plans/:planId/apply")
  @HttpCode(HttpStatus.OK)
  @ResponseMessage(MESSAGE_ID.aiPlanApplied)
  apply(@Param("planId") planId: string, @Body() dto: ApplyPlanDto): Promise<ApplyResult> {
    return this.plans.apply({ planId, operationIds: dto.operationIds });
  }

  @Post("ai-plans/:planId/reject")
  @HttpCode(HttpStatus.OK)
  @ResponseMessage(MESSAGE_ID.aiPlanRejected)
  async reject(@Param("planId") planId: string): Promise<null> {
    await this.plans.reject(planId);

    return null;
  }
}
