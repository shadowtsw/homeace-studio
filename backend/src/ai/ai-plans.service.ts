import { randomUUID } from "node:crypto";

import { ConflictException, Inject, Injectable, Logger, NotFoundException } from "@nestjs/common";

import { apiError } from "src/common/api/api-response";
import { MESSAGE_ID, type MessageId } from "src/messages/message-ids";
import { CategoriesService } from "../categories/categories.service";
import { EntriesService } from "../entries/entries.service";
import { LiveService } from "../live/live.service";
import { OVERLAY_REPOSITORY } from "../overlay/overlay.constants";
import type { OverlayRepository } from "../overlay/repositories/overlay.repository";
import {
  AI_OPERATION_STATE,
  AI_OPERATION_TYPE,
  AI_PLAN_STATUS,
  type AiPlan,
} from "./ai-plan.model";
import {
  checkProposal,
  collectFolders,
  keepRecent,
  operationState,
  PlanInputError,
  toView,
  type AiPlanView,
  type PlanContext,
  type ProposedPlan,
} from "./ai-plan-rules";
import { MAX_OPEN_PLANS } from "./ai.constants";

export type ApplyResult = {
  appliedCount: number;
  failed: { operationId: string; messageId: MessageId }[];
};

export type ProposeOptions = {
  input: ProposedPlan;
  client: string | null;
};

export type ApplyOptions = {
  planId: string;
  operationIds: string[];
};

/**
 * Folder plans an AI proposes over MCP. The AI never changes HA itself: a plan waits here until the
 * user applies all or some of its operations in the app, or rejects it. The AI can ask for the
 * outcome afterwards.
 */
@Injectable()
export class AiPlansService {
  private readonly logger = new Logger(AiPlansService.name);

  constructor(
    @Inject(OVERLAY_REPOSITORY) private readonly overlay: OverlayRepository,
    private readonly entries: EntriesService,
    private readonly categories: CategoriesService,
    private readonly live: LiveService,
  ) {}

  /** @throws PlanInputError with every problem found, so the AI can fix them in one go. */
  async propose({ input, client }: ProposeOptions): Promise<AiPlan> {
    const [context, overlay] = await Promise.all([this.loadContext(), this.overlay.read()]);

    if (
      overlay.aiPlans.filter((plan) => plan.status === AI_PLAN_STATUS.open).length >= MAX_OPEN_PLANS
    ) {
      throw new PlanInputError([
        `There are already ${MAX_OPEN_PLANS} open plans. Ask the user to review them first.`,
      ]);
    }

    const { operations, problems } = checkProposal({ input, context });

    if (problems.length > 0) throw new PlanInputError(problems);

    const plan: AiPlan = {
      id: randomUUID(),
      title: input.title.trim(),
      reasoning: input.reasoning.trim(),
      client,
      createdAt: new Date().toISOString(),
      status: AI_PLAN_STATUS.open,
      operations,
      appliedOperationIds: [],
      decidedAt: null,
    };

    await this.overlay.update((current) => ({
      ...current,
      aiPlans: keepRecent([plan, ...current.aiPlans]),
    }));
    this.logger.log(
      `Plan "${plan.title}" with ${operations.length} operations from ${client ?? "unknown"}`,
    );
    this.live.notify();

    return plan;
  }

  /** Newest first, every operation with its state right now. */
  async list(): Promise<AiPlanView[]> {
    const [context, overlay] = await Promise.all([this.loadContext(), this.overlay.read()]);

    return overlay.aiPlans.map((plan) => toView({ plan, context }));
  }

  async find(planId: string): Promise<AiPlan | null> {
    const overlay = await this.overlay.read();

    return overlay.aiPlans.find((plan) => plan.id === planId) ?? null;
  }

  /**
   * Runs the chosen operations that still fit: folder renames first, then moves. One failing
   * operation does not stop the others. Operations that were already true count as done, so the
   * plan is "applied" when everything it asked for is true afterwards.
   */
  async apply({ planId, operationIds }: ApplyOptions): Promise<ApplyResult> {
    const plan = await this.requireOpen(planId);
    const context = await this.loadContext();
    const alreadyDone = plan.operations
      .filter((operation) => operationState({ operation, context }) === AI_OPERATION_STATE.done)
      .map((operation) => operation.id);
    const chosen = plan.operations.filter(
      (operation) =>
        operationIds.includes(operation.id) &&
        operationState({ operation, context }) === AI_OPERATION_STATE.ok,
    );
    const ordered = [
      ...chosen.filter((operation) => operation.type === AI_OPERATION_TYPE.renameFolder),
      ...chosen.filter((operation) => operation.type === AI_OPERATION_TYPE.moveEntry),
    ];
    const appliedIds: string[] = [];
    const failed: ApplyResult["failed"] = [];

    for (const operation of ordered) {
      try {
        if (operation.type === AI_OPERATION_TYPE.renameFolder) {
          await this.categories.rename({ from: operation.from, to: operation.to });
        } else {
          await this.entries.moveToCategory({
            entityId: operation.entityId,
            categoryPath: operation.to,
          });
        }
        appliedIds.push(operation.id);
      } catch (error) {
        this.logger.warn(`Plan ${planId}, ${operation.id} failed: ${String(error)}`);
        failed.push({ operationId: operation.id, messageId: MESSAGE_ID.aiOperationFailed });
      }
    }

    const fulfilledIds = [...alreadyDone, ...appliedIds];
    const isComplete = fulfilledIds.length === plan.operations.length;
    await this.decide({
      planId,
      status: isComplete ? AI_PLAN_STATUS.applied : AI_PLAN_STATUS.partial,
      appliedIds: fulfilledIds,
    });

    return { appliedCount: appliedIds.length, failed };
  }

  async reject(planId: string): Promise<void> {
    await this.requireOpen(planId);
    await this.decide({ planId, status: AI_PLAN_STATUS.rejected, appliedIds: [] });
  }

  private async decide({
    planId,
    status,
    appliedIds,
  }: {
    planId: string;
    status: AiPlan["status"];
    appliedIds: string[];
  }): Promise<void> {
    const decidedAt = new Date().toISOString();

    await this.overlay.update((current) => ({
      ...current,
      aiPlans: current.aiPlans.map((plan) => {
        if (plan.id !== planId) return plan;

        return { ...plan, status, appliedOperationIds: appliedIds, decidedAt };
      }),
    }));
    this.live.notify();
  }

  private async requireOpen(planId: string): Promise<AiPlan> {
    const plan = await this.find(planId);

    if (!plan) throw new NotFoundException(apiError({ message: MESSAGE_ID.aiPlanNotFound }));
    if (plan.status !== AI_PLAN_STATUS.open) {
      throw new ConflictException(apiError({ message: MESSAGE_ID.aiPlanClosed }));
    }

    return plan;
  }

  private async loadContext(): Promise<PlanContext> {
    const [entries, overlay] = await Promise.all([this.entries.findAll(), this.overlay.read()]);

    return {
      entries: new Map(entries.map((entry) => [entry.entityId, entry])),
      folders: collectFolders({ entries, savedFolders: overlay.folders }),
    };
  }
}
