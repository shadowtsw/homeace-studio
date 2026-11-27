import { CATEGORY_SEPARATOR } from "../categories/categories.constants";
import { isSameOrBelow, normalizeCategoryPath } from "../categories/category-path";
import type { Entry, EntryKind } from "../entries/entry.model";
import {
  AI_OPERATION_STATE,
  AI_OPERATION_TYPE,
  AI_PLAN_STATUS,
  type AiOperationState,
  type AiPlan,
  type AiPlanOperation,
} from "./ai-plan.model";
import { MAX_KEPT_PLANS } from "./ai.constants";

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

/** The plan cannot be taken as it is; the messages go back to the AI in plain English. */
export class PlanInputError extends Error {
  constructor(readonly problems: string[]) {
    super(problems.join("\n"));
    this.name = PlanInputError.name;
  }
}

/** Today's entries by entity ID and every folder path, to judge operations against. */
export type PlanContext = { entries: Map<string, Entry>; folders: ReadonlySet<string> };

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

export type CheckProposalOptions = {
  input: ProposedPlan;
  context: PlanContext;
};

/**
 * Turns what an AI proposed into plan operations, checked against today's folders and entries.
 * @returns The operations, and every problem found (in plain English, for the AI).
 */
export function checkProposal({ input, context }: CheckProposalOptions): {
  operations: AiPlanOperation[];
  problems: string[];
} {
  const problems: string[] = [];
  const operations: AiPlanOperation[] = [];
  const movedIds = new Set<string>();

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

  return { operations, problems };
}

export type ToViewOptions = {
  plan: AiPlan;
  context: PlanContext;
};

/** A plan with every operation's state right now (decided plans keep "done"). */
export function toView({ plan, context }: ToViewOptions): AiPlanView {
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
export function keepRecent(plans: AiPlan[]): AiPlan[] {
  let decidedKept = 0;

  return plans.filter((plan) => {
    if (plan.status === AI_PLAN_STATUS.open) return true;
    decidedKept++;
    return decidedKept <= MAX_KEPT_PLANS;
  });
}
