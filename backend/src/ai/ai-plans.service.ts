import { randomUUID } from "node:crypto";

import { ConflictException, Inject, Injectable, Logger, NotFoundException } from "@nestjs/common";

import { apiError } from "src/common/api/api-response";
import { MESSAGE_ID, type MessageId } from "src/messages/message-ids";
import { CATEGORY_SEPARATOR } from "../categories/categories.constants";
import { CategoriesService } from "../categories/categories.service";
import { isSameOrBelow, normalizeCategoryPath } from "../categories/category-path";
import { EntriesService } from "../entries/entries.service";
import type { Entry, EntryKind } from "../entries/entry.model";
import { LiveService } from "../live/live.service";
import { OVERLAY_REPOSITORY } from "../overlay/overlay.constants";
import type { OverlayRepository } from "../overlay/repositories/overlay.repository";
import {
  AI_OPERATION_STATE,
  AI_OPERATION_TYPE,
  AI_PLAN_STATUS,
  type AiOperationState,
  type AiPlan,
  type AiPlanOperation,
} from "./ai-plan.model";
import { MAX_KEPT_PLANS, MAX_OPEN_PLANS } from "./ai.constants";

/** What an AI sends; validated here, because only the AI's wording comes from outside. */
export type ProposedOperation =
  | { type: typeof AI_OPERATION_TYPE.renameFolder; from: string; to: string }
  | { type: typeof AI_OPERATION_TYPE.moveEntry; entityId: string; to: string };

export type ProposedPlan = { title: string; reasoning: string; operations: ProposedOperation[] };

/** A plan as the review dialog shows it: every operation with its current state. */
export type AiOperationView = AiPlanOperation & {
  state: AiOperationState;
  /** Move only: where the entry is now, and what it is. */
  currentFolder?: string | null;
  kind?: EntryKind;
};
export type AiPlanView = Omit<AiPlan, "operations"> & { operations: AiOperationView[] };

export type ApplyResult = {
  appliedCount: number;
  failed: { operationId: string; messageId: MessageId }[];
};

/** The plan cannot be taken as it is; the messages go back to the AI in plain English. */
export class PlanInputError extends Error {
  constructor(readonly problems: string[]) {
    super(problems.join("\n"));
    this.name = PlanInputError.name;
  }
}

type PlanContext = { entries: Map<string, Entry>; folders: ReadonlySet<string> };

export type CollectFoldersOptions = {
  entries: Entry[];
  savedFolders: string[];
};

/** Every folder path that exists: category names, the user's empty folders, and their parents. */
export function collectFolders({ entries, savedFolders }: CollectFoldersOptions): Set<string> {
  const folders = new Set<string>();
  const add = (path: string): void => {
    const levels = path.split(CATEGORY_SEPARATOR);
    for (let depth = 1; depth <= levels.length; depth++) {
      folders.add(levels.slice(0, depth).join(CATEGORY_SEPARATOR));
    }
  };

  for (const entry of entries) if (entry.categoryPath) add(entry.categoryPath);
  for (const path of savedFolders) add(path);

  return folders;
}

export type OperationStateOptions = {
  operation: AiPlanOperation;
  context: PlanContext;
};

export function operationState({ operation, context }: OperationStateOptions): AiOperationState {
  if (operation.type === AI_OPERATION_TYPE.renameFolder) {
    if (!context.folders.has(operation.from)) return AI_OPERATION_STATE.gone;
    if (operation.from === operation.to) return AI_OPERATION_STATE.done;
    if (context.folders.has(operation.to)) return AI_OPERATION_STATE.conflict;
    return AI_OPERATION_STATE.ok;
  }

  const entry = context.entries.get(operation.entityId);

  if (!entry) return AI_OPERATION_STATE.gone;
  if (!entry.isInRegistry) return AI_OPERATION_STATE.conflict;
  if (entry.categoryPath === operation.to) return AI_OPERATION_STATE.done;
  return AI_OPERATION_STATE.ok;
}

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
    const problems: string[] = [];
    const operations: AiPlanOperation[] = [];
    const movedIds = new Set<string>();

    if (
      overlay.aiPlans.filter((plan) => plan.status === AI_PLAN_STATUS.open).length >= MAX_OPEN_PLANS
    ) {
      throw new PlanInputError([
        `There are already ${MAX_OPEN_PLANS} open plans. Ask the user to review them first.`,
      ]);
    }

    input.operations.forEach((proposed, index) => {
      const id = `op${index + 1}`;
      const label = `Operation ${index + 1}`;
      const to = normalizeCategoryPath(proposed.to);

      if (to === null) {
        problems.push(`${label}: "${proposed.to}" is not a valid folder path (empty level).`);
        return;
      }

      if (proposed.type === AI_OPERATION_TYPE.moveEntry) {
        const entry = context.entries.get(proposed.entityId);

        if (!entry) problems.push(`${label}: there is no entry "${proposed.entityId}".`);
        else if (!entry.isInRegistry) {
          problems.push(
            `${label}: "${proposed.entityId}" comes from YAML without a unique_id and cannot be moved.`,
          );
        } else if (movedIds.has(entry.entityId)) {
          problems.push(`${label}: "${proposed.entityId}" is moved twice in this plan.`);
        } else {
          movedIds.add(entry.entityId);
          operations.push({
            id,
            type: proposed.type,
            entityId: entry.entityId,
            entryName: entry.name,
            to,
          });
        }
        return;
      }

      const from = normalizeCategoryPath(proposed.from);

      if (from === null || !context.folders.has(from)) {
        problems.push(`${label}: there is no folder "${proposed.from}".`);
      } else if (isSameOrBelow({ path: to, ancestor: from })) {
        problems.push(`${label}: "${from}" cannot be moved into itself ("${to}").`);
      } else if (context.folders.has(to)) {
        problems.push(`${label}: the folder "${to}" exists already; move its entries instead.`);
      } else {
        operations.push({ id, type: proposed.type, from, to });
      }
    });

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
      aiPlans: current.aiPlans.map((plan) =>
        plan.id === planId ? { ...plan, status, appliedOperationIds: appliedIds, decidedAt } : plan,
      ),
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

function toView({ plan, context }: { plan: AiPlan; context: PlanContext }): AiPlanView {
  return {
    ...plan,
    operations: plan.operations.map((operation): AiOperationView => {
      // Decided plans show what happened; their states would only describe today.
      const state =
        plan.status === AI_PLAN_STATUS.open
          ? operationState({ operation, context })
          : AI_OPERATION_STATE.done;

      if (operation.type === AI_OPERATION_TYPE.renameFolder) return { ...operation, state };

      const entry = context.entries.get(operation.entityId);

      return { ...operation, state, currentFolder: entry?.categoryPath ?? null, kind: entry?.kind };
    }),
  };
}

/** Open plans always stay; of the decided ones only the newest. */
function keepRecent(plans: AiPlan[]): AiPlan[] {
  let decidedKept = 0;

  return plans.filter((plan) => {
    if (plan.status === AI_PLAN_STATUS.open) return true;
    decidedKept++;
    return decidedKept <= MAX_KEPT_PLANS;
  });
}
