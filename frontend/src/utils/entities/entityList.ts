import { CATEGORY_FILTER } from "@/constants/entries";
import type { EntityOption } from "@/types/editor";
import type { Entry } from "@/types/entry";

import { isSameOrBelow } from "../categories/categoryPath";
import { areaOfFilter, compareCategoryPaths, type EntryGroup } from "../entries/entryFilter";

export type EntityListFilter = {
  /** A category path, one of CATEGORY_FILTER or an area selection. */
  category: string;
  search: string;
  /** Automations, scripts, scenes and helpers have rows of their own; they are not listed twice. */
  entryIds: ReadonlySet<string>;
};

/** A group of the list: entries of a folder, then the plain entities sorted into it. */
export type ListGroup = EntryGroup & { entities: EntityOption[] };

/**
 * Whether a plain entity belongs to a tree selection: its folder (and everything below), "Ohne
 * Kategorie", or HA's area. Favorites and the check-up are entries only.
 */
export function isEntityInCategory(entity: EntityOption, category: string): boolean {
  const area = areaOfFilter(category);

  if (area !== undefined) return entity.areaId === area;
  if (category === CATEGORY_FILTER.all) return true;
  if (category === CATEGORY_FILTER.uncategorized) return entity.categoryPath === null;
  if (category === CATEGORY_FILTER.favorites || category === CATEGORY_FILTER.checkup) return false;

  return entity.categoryPath !== null && isSameOrBelow(entity.categoryPath, category);
}

/** Search on name, entity ID, device and area (case-insensitive); blank matches everything. */
export function matchesEntitySearch(entity: EntityOption, search: string): boolean {
  const query = search.trim().toLowerCase();

  if (!query) return true;

  const fields = [entity.name, entity.entityId, entity.deviceName ?? "", entity.areaName ?? ""];

  return fields.some((field) => field.toLowerCase().includes(query));
}

/** The plain entities a list shows for this selection and search. */
export function filterListEntities(
  entities: readonly EntityOption[],
  filter: EntityListFilter,
): EntityOption[] {
  return entities.filter(
    (entity) =>
      !filter.entryIds.has(entity.entityId) &&
      isEntityInCategory(entity, filter.category) &&
      matchesEntitySearch(entity, filter.search),
  );
}

/**
 * Groups entries and plain entities by folder, in one order: a folder shows its automations,
 * helpers … and then its entities. Entities without a folder join the "Ohne Kategorie" group.
 */
export function groupListItems(
  entries: readonly Entry[],
  entities: readonly EntityOption[],
): ListGroup[] {
  const groups = new Map<string | null, ListGroup>();
  const groupOf = (path: string | null): ListGroup => {
    const existing = groups.get(path);
    if (existing) return existing;

    const created: ListGroup = { path, entries: [], entities: [] };
    groups.set(path, created);
    return created;
  };

  entries.forEach((entry) => groupOf(entry.categoryPath).entries.push(entry));
  entities.forEach((entity) => groupOf(entity.categoryPath).entities.push(entity));

  return [...groups.keys()].sort(compareCategoryPaths).map((path) => groupOf(path));
}
