import { BadRequestException, Inject, Injectable, Logger } from "@nestjs/common";

import { moveFolderOrder } from "../folder-order";
import { apiError } from "src/common/api/api-response";
import { MESSAGE_ID } from "src/messages/message-ids";
import { OVERLAY_REPOSITORY } from "../../overlay/overlay.constants";
import type { OverlayRepository } from "../../overlay/repositories/overlay.repository";
import { CATEGORY_REPOSITORY, CATEGORY_SCOPES } from "../categories.constants";
import type { CategoryRepository } from "../repositories/category.repository";
import { requireCategoryPath } from "../require-category-path";
import {
  findCleanupProposals,
  planCleanup,
  type CleanupChange,
  type CleanupOperation,
  type CleanupProposal,
  type ScopeAssignments,
  type ScopeCategories,
} from "./cleanup-analysis";

export type CleanupOverview = { proposals: CleanupProposal[]; ignoredCount: number };

/** What the UI shows of a planned step; ids stay in the backend. */
export type CleanupStep = Pick<CleanupOperation, "scope" | "kind" | "from" | "to"> & {
  entryCount: number;
};

export type CleanupResult = { categoryCount: number; stepCount: number };

function toStep(operation: CleanupOperation): CleanupStep {
  const { scope, kind, from, to, entityIds } = operation;

  return { scope, kind, from, to, entryCount: entityIds.length };
}

/**
 * The tidy-up assistant: proposes turning old dash categories into real subfolders and merging
 * near-duplicates, shows exactly what HA will do, and does it only for the lines the user confirmed.
 */
@Injectable()
export class CleanupService {
  private readonly logger = new Logger(CleanupService.name);

  constructor(
    @Inject(CATEGORY_REPOSITORY) private readonly categories: CategoryRepository,
    @Inject(OVERLAY_REPOSITORY) private readonly overlay: OverlayRepository,
  ) {}

  async overview(): Promise<CleanupOverview> {
    const [{ categories, assignments }, overlay] = await Promise.all([
      this.loadState(),
      this.overlay.read(),
    ]);
    const ignored = new Set(overlay.cleanupIgnored);

    return {
      proposals: findCleanupProposals({ categories, assignments, ignored }),
      ignoredCount: ignored.size,
    };
  }

  async preview(changes: CleanupChange[]): Promise<CleanupStep[]> {
    const { categories, assignments } = await this.loadState();

    return planCleanup({ changes: this.normalize(changes), categories, assignments }).map(toStep);
  }

  /**
   * Plans again from HA's current state (the preview may be old) and runs the steps in order.
   * Renamed or merged names keep their folder color and empty subfolders under the new path.
   */
  async apply(changes: CleanupChange[]): Promise<CleanupResult> {
    const normalized = this.normalize(changes);
    const { categories, assignments } = await this.loadState();
    const operations = planCleanup({ changes: normalized, categories, assignments });
    const deletedIds: string[] = [];

    for (const operation of operations) {
      if (operation.kind === "rename") {
        await this.categories.rename({
          scope: operation.scope,
          categoryId: operation.categoryId,
          name: operation.to,
        });
        continue;
      }

      for (const entityId of operation.entityIds) {
        await this.categories.assign({
          entityId,
          scope: operation.scope,
          categoryId: operation.targetCategoryId,
        });
      }

      await this.categories.delete({ scope: operation.scope, categoryId: operation.categoryId });
      deletedIds.push(operation.categoryId);
    }

    const pathByName = new Map(normalized.map(({ from, to }) => [from, to]));
    const movePath = (path: string): string => pathByName.get(path) ?? path;

    await this.overlay.update((overlay) => ({
      ...overlay,
      ownedCategoryIds: overlay.ownedCategoryIds.filter((id) => !deletedIds.includes(id)),
      folders: [...new Set(overlay.folders.map(movePath))],
      folderColors: Object.fromEntries(
        Object.entries(overlay.folderColors).map(([path, color]) => [movePath(path), color]),
      ),
      folderOrder: moveFolderOrder({ order: overlay.folderOrder, movePath }),
    }));

    const categoryCount = new Set(operations.map((operation) => operation.from)).size;
    this.logger.log(`Clean-up: ${operations.length} steps for ${categoryCount} category names`);

    return { categoryCount, stepCount: operations.length };
  }

  async ignore(key: string): Promise<void> {
    await this.overlay.update((overlay) => ({
      ...overlay,
      cleanupIgnored: [...new Set([...overlay.cleanupIgnored, key])],
    }));
  }

  async restoreIgnored(): Promise<void> {
    await this.overlay.update((overlay) => ({ ...overlay, cleanupIgnored: [] }));
  }

  private normalize(changes: CleanupChange[]): CleanupChange[] {
    const seen = new Set<string>();

    return changes.map(({ from, to }) => {
      if (seen.has(from)) {
        throw new BadRequestException(
          apiError({ message: MESSAGE_ID.cleanupDuplicate, details: { params: { path: from } } }),
        );
      }
      seen.add(from);

      return { from, to: requireCategoryPath(to) };
    });
  }

  private async loadState(): Promise<{
    categories: ScopeCategories;
    assignments: ScopeAssignments;
  }> {
    const [lists, assignmentMaps] = await Promise.all([
      Promise.all(CATEGORY_SCOPES.map((scope) => this.categories.list(scope))),
      Promise.all(CATEGORY_SCOPES.map((scope) => this.categories.listAssignments(scope))),
    ]);
    const byScope = <T>(values: T[]) =>
      Object.fromEntries(CATEGORY_SCOPES.map((scope, index) => [scope, values[index]]));

    return {
      categories: byScope(lists) as ScopeCategories,
      assignments: byScope(assignmentMaps) as ScopeAssignments,
    };
  }
}
