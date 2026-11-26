import { Injectable } from "@nestjs/common";

import { HaCommandError } from "../../ha/ha-command.error";
import { HaConnectionService } from "../../ha/ha-connection.service";
import { HA_COMMAND, HA_ERROR_CODE } from "../../ha/ha.constants";
import type { HaCategory, HaEntityRegistryEntry } from "../../ha/ha.types";
import type { CategoryScope } from "../categories.constants";
import type { Category } from "../category.model";
import type {
  CategoryRepository,
  CreateCategoryOptions,
  RenameCategoryOptions,
  DeleteCategoryOptions,
  AssignCategoryOptions,
  CountAssignedOptions,
  FindEntityCategoryOptions,
} from "./category.repository";

function toCategory(category: HaCategory): Category {
  return { categoryId: category.category_id, name: category.name };
}

@Injectable()
export class HaCategoriesRepository implements CategoryRepository {
  constructor(private readonly ha: HaConnectionService) {}

  async list(scope: CategoryScope): Promise<Category[]> {
    const categories = await this.ha.call<HaCategory[]>({
      type: HA_COMMAND.categoryRegistryList,
      payload: {
        scope,
      },
    });

    return categories.map(toCategory);
  }

  async create({ scope, name }: CreateCategoryOptions): Promise<Category> {
    const category = await this.ha.call<HaCategory>({
      type: HA_COMMAND.categoryRegistryCreate,
      payload: {
        scope,
        name,
      },
    });

    return toCategory(category);
  }

  async rename({ scope, categoryId, name }: RenameCategoryOptions): Promise<void> {
    await this.ha.call({
      type: HA_COMMAND.categoryRegistryUpdate,
      payload: {
        scope,
        category_id: categoryId,
        name,
      },
    });
  }

  async delete({ scope, categoryId }: DeleteCategoryOptions): Promise<void> {
    await this.ha.call({
      type: HA_COMMAND.categoryRegistryDelete,
      payload: { scope, category_id: categoryId },
    });
  }

  async assign({ entityId, scope, categoryId }: AssignCategoryOptions): Promise<void> {
    // HA merges this into the entity's categories; null removes the entry for this scope.
    await this.ha.call({
      type: HA_COMMAND.entityRegistryUpdate,
      payload: {
        entity_id: entityId,
        categories: { [scope]: categoryId },
      },
    });
  }

  async countAssigned({ scope, categoryId }: CountAssignedOptions): Promise<number> {
    const entries = await this.ha.call<HaEntityRegistryEntry[]>({
      type: HA_COMMAND.entityRegistryList,
    });
    const assigned = entries.filter((entry) => entry.categories[scope] === categoryId);

    return assigned.length;
  }

  async findEntityCategory({
    entityId,
    scope,
  }: FindEntityCategoryOptions): Promise<string | null | undefined> {
    try {
      const entry = await this.ha.call<HaEntityRegistryEntry>({
        type: HA_COMMAND.entityRegistryGet,
        payload: {
          entity_id: entityId,
        },
      });

      return entry.categories[scope] ?? null;
    } catch (error) {
      if (error instanceof HaCommandError && error.code === HA_ERROR_CODE.notFound)
        return undefined;
      throw error;
    }
  }

  async listAssignments(scope: CategoryScope): Promise<Map<string, string[]>> {
    const entries = await this.ha.call<HaEntityRegistryEntry[]>({
      type: HA_COMMAND.entityRegistryList,
    });
    const byCategory = new Map<string, string[]>();

    for (const entry of entries) {
      const categoryId = entry.categories[scope];

      if (categoryId)
        byCategory.set(categoryId, [...(byCategory.get(categoryId) ?? []), entry.entity_id]);
    }

    return byCategory;
  }
}
