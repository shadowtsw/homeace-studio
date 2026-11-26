import type { CategoryScope } from "../categories.constants";
import type { Category } from "../category.model";

export type CreateCategoryOptions = {
  scope: CategoryScope;
  name: string;
};

export type RenameCategoryOptions = {
  scope: CategoryScope;
  categoryId: string;
  name: string;
};

export type DeleteCategoryOptions = {
  scope: CategoryScope;
  categoryId: string;
};

export type AssignCategoryOptions = {
  entityId: string;
  scope: CategoryScope;
  categoryId: string | null;
};

export type CountAssignedOptions = {
  scope: CategoryScope;
  categoryId: string;
};

export type FindEntityCategoryOptions = {
  entityId: string;
  scope: CategoryScope;
};

export interface CategoryRepository {
  list(scope: CategoryScope): Promise<Category[]>;
  create(options: CreateCategoryOptions): Promise<Category>;
  rename(options: RenameCategoryOptions): Promise<void>;
  delete(options: DeleteCategoryOptions): Promise<void>;
  /** Sets the entity's category in this scope; null removes it. Other scopes stay as they are. */
  assign(options: AssignCategoryOptions): Promise<void>;
  /** How many entities have this category in this scope. */
  countAssigned(options: CountAssignedOptions): Promise<number>;
  /**
   * The entity's category id in this scope (null: none). Undefined when HA has no registry entry for
   * the entity, so it cannot have categories at all.
   */
  findEntityCategory(options: FindEntityCategoryOptions): Promise<string | null | undefined>;
  /** Entity IDs per category id in this scope, from one registry read. */
  listAssignments(scope: CategoryScope): Promise<Map<string, string[]>>;
}
