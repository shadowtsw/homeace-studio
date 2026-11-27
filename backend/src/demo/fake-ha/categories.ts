import type { CategoryScope } from "../../categories/categories.constants";
import { HaCommandError } from "../../ha/ha-command.error";
import type { HaCategory } from "../../ha/ha.types";
import { emit, type FakeHaData } from "./data";
import { ERROR_CODE, text, type Payload } from "./shared";

/** The category list of a scope; HA keeps one per scope and refuses unknown scopes. */
export function categoryList({ ha, scope }: { ha: FakeHaData; scope: unknown }): HaCategory[] {
  const list = ha.categories.get(scope as CategoryScope);

  if (!list) throw new HaCommandError(ERROR_CODE.invalid, "Unknown scope");

  return list;
}

export function ensureCategory({
  ha,
  scope,
  name,
}: {
  ha: FakeHaData;
  scope: CategoryScope;
  name: string;
}): HaCategory {
  const list = categoryList({ ha, scope });
  const existing = list.find((category) => category.name === name);

  if (existing) return existing;

  const category = { category_id: `demo_category_${ha.nextId++}`, name, icon: null };
  list.push(category);

  return category;
}

export function createCategory({ ha, payload }: { ha: FakeHaData; payload: Payload }): HaCategory {
  const list = categoryList({ ha, scope: payload.scope });
  const name = text(payload.name).trim();

  if (!name || list.some((category) => category.name === name)) {
    throw new HaCommandError(ERROR_CODE.invalid, `The name "${name}" is already in use`);
  }

  const category = ensureCategory({ ha, scope: payload.scope as CategoryScope, name });
  emit({
    ha,
    eventType: "category_registry_updated",
    data: { action: "create", scope: payload.scope },
  });

  return structuredClone(category);
}

export function renameCategory({ ha, payload }: { ha: FakeHaData; payload: Payload }): HaCategory {
  const list = categoryList({ ha, scope: payload.scope });
  const category = list.find((item) => item.category_id === payload.category_id);
  const name = text(payload.name).trim();

  if (!category) throw new HaCommandError(ERROR_CODE.notFound, "Category not found");
  if (list.some((item) => item !== category && item.name === name)) {
    throw new HaCommandError(ERROR_CODE.invalid, `The name "${name}" is already in use`);
  }

  category.name = name;
  emit({
    ha,
    eventType: "category_registry_updated",
    data: { action: "update", scope: payload.scope },
  });

  return structuredClone(category);
}

export function deleteCategory({ ha, payload }: { ha: FakeHaData; payload: Payload }): null {
  const scope = payload.scope as CategoryScope;
  const list = categoryList({ ha, scope });
  const index = list.findIndex((item) => item.category_id === payload.category_id);

  if (index < 0) throw new HaCommandError(ERROR_CODE.notFound, "Category not found");

  list.splice(index, 1);

  for (const entry of ha.registry.values()) {
    if (entry.categories[scope] === payload.category_id) delete entry.categories[scope];
  }

  emit({ ha, eventType: "category_registry_updated", data: { action: "remove", scope } });

  return null;
}
