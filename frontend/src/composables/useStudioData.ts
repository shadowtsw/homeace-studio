import { computed, type ComputedRef } from "vue";

import { CATEGORY_FILTER, SCOPE_ALL, SCOPE_ENTITIES, type ListScope } from "@/constants/entries";
import { useEntriesStore } from "@/stores/entriesStore";
import { useEntryAreasStore } from "@/stores/entryAreasStore";
import { useFoldersStore } from "@/stores/foldersStore";
import { useLookupsStore } from "@/stores/lookupsStore";
import { useStudioStore } from "@/stores/studioStore";
import type { EntityOption } from "@/types/editor";
import type { Entry } from "@/types/entry";
import { applyFolderOrder } from "@/utils/categories/folderOrder";
import { buildCategoryTree, flattenCategoryPaths, type CategoryNode } from "@/utils/categories/categoryTree";
import { filterListEntities } from "@/utils/entities/entityList";
import { countByScope, filterEntries, isSpecialCategory } from "@/utils/entries/entryFilter";

/** One area in the tree of the area view. */
export type AreaNavItem = { areaId: string; name: string; icon: string | null; count: number };

type StudioData = {
  /** Entries of the current scope tab, regardless of tree selection and search. */
  scopedEntries: ComputedRef<Entry[]>;
  tree: ComputedRef<CategoryNode[]>;
  /** Every folder path in every scope, plus saved empty folders. */
  allCategoryPaths: ComputedRef<string[]>;
  /** The selected real folder; null for special nodes like "all". */
  currentFolder: ComputedRef<string | null>;
  uncategorizedCount: ComputedRef<number>;
  favoriteCount: ComputedRef<number>;
  scopeCounts: ComputedRef<Record<ListScope, number>>;
  visibleEntries: ComputedRef<Entry[]>;
  /** Plain entities of the selection and search; empty unless the filter "Entitäten" is chosen. */
  visibleEntities: ComputedRef<EntityOption[]>;
  /** Every area, those with entries in the current scope first, then by name. */
  areaNav: ComputedRef<AreaNavItem[]>;
  /** Entries of the current scope without any area. */
  noAreaCount: ComputedRef<number>;
  selectedEntry: ComputedRef<Entry | null>;
};

/** Everything the studio page derives from entries, folders and the current selection. */
export function useStudioData(): StudioData {
  const entriesStore = useEntriesStore();
  const foldersStore = useFoldersStore();
  const studio = useStudioStore();
  const entryAreas = useEntryAreasStore();
  const lookups = useLookupsStore();
  const areaIdsOf = (entityId: string): string[] =>
    entryAreas.linksOf(entityId).map((link) => link.areaId);

  // Counts follow the filters; the folders themselves stay, so the tree keeps its shape.
  const scopedEntries = computed(() =>
    filterEntries(entriesStore.entries, {
      scopes: studio.scopes,
      category: CATEGORY_FILTER.all,
      search: "",
    }),
  );
  // Plain entities: everything HA has minus the entries, which have rows of their own.
  const entryIds = computed(() => new Set(entriesStore.entries.map((entry) => entry.entityId)));
  const plainEntities = computed(() =>
    lookups.entities.filter((entity) => !entryIds.value.has(entity.entityId)),
  );
  /** Plain entities count and show only while their filter is chosen. */
  const scopedEntities = computed(() => (studio.isShowingEntities ? plainEntities.value : []));
  const tree = computed(() =>
    applyFolderOrder(
      buildCategoryTree(
        [
          ...scopedEntries.value.map((entry) => entry.categoryPath),
          ...scopedEntities.value.map((entity) => entity.categoryPath),
        ],
        foldersStore.folders,
        [
          ...entriesStore.entries.map((entry) => entry.categoryPath),
          ...plainEntities.value.map((entity) => entity.categoryPath),
        ],
      ),
      foldersStore.order,
    ),
  );
  // Suggestions and the rename preview cover every scope, because a rename affects all of them.
  const allCategoryPaths = computed(() =>
    flattenCategoryPaths(
      buildCategoryTree(
        [
          ...entriesStore.entries.map((entry) => entry.categoryPath),
          ...plainEntities.value.map((entity) => entity.categoryPath),
        ],
        foldersStore.folders,
      ),
    ),
  );
  const currentFolder = computed(() =>
    isSpecialCategory(studio.category) ? null : studio.category,
  );
  const uncategorizedCount = computed(
    () =>
      scopedEntries.value.filter((entry) => entry.categoryPath === null).length +
      scopedEntities.value.filter((entity) => entity.categoryPath === null).length,
  );
  const favoriteCount = computed(
    () => scopedEntries.value.filter((entry) => entry.isFavorite).length,
  );
  // The numbers on the filters: what each one would show here, whatever is chosen right now
  const scopeCounts = computed(() => {
    const entries = filterEntries(entriesStore.entries, {
      scopes: [SCOPE_ALL],
      category: studio.category,
      search: studio.search,
      areaIdsOf,
    });
    const entities = filterListEntities(plainEntities.value, {
      category: studio.category,
      search: studio.search,
      entryIds: entryIds.value,
    });

    return { ...countByScope(entries), [SCOPE_ENTITIES]: entities.length };
  });
  const visibleEntries = computed(() =>
    filterEntries(entriesStore.entries, {
      scopes: studio.scopes,
      category: studio.category,
      search: studio.search,
      areaIdsOf,
    }),
  );
  const visibleEntities = computed(() =>
    filterListEntities(scopedEntities.value, {
      category: studio.category,
      search: studio.search,
      entryIds: entryIds.value,
    }),
  );
  // Every area HA has, also empty ones (a target for dragged entries); those with entries first.
  const areaNav = computed(() => {
    const counts = new Map<string, number>();
    const items = new Map(
      lookups.areas.map((area) => [
        area.areaId,
        { areaId: area.areaId, name: area.name, icon: area.icon },
      ]),
    );

    for (const entry of scopedEntries.value) {
      for (const link of entryAreas.linksOf(entry.entityId)) {
        counts.set(link.areaId, (counts.get(link.areaId) ?? 0) + 1);
        if (!items.has(link.areaId))
          items.set(link.areaId, { areaId: link.areaId, name: link.name, icon: null });
      }
    }

    // A plain entity counts in HA's area of it (its own or its device's)
    for (const entity of scopedEntities.value) {
      if (entity.areaId) counts.set(entity.areaId, (counts.get(entity.areaId) ?? 0) + 1);
    }

    return [...items.values()]
      .map((area) => ({ ...area, count: counts.get(area.areaId) ?? 0 }))
      .sort(
        (a, b) =>
          Number(b.count > 0) - Number(a.count > 0) ||
          a.name.localeCompare(b.name, undefined, { sensitivity: "base" }),
      );
  });
  const noAreaCount = computed(
    () =>
      scopedEntries.value.filter((entry) => areaIdsOf(entry.entityId).length === 0).length +
      scopedEntities.value.filter((entity) => entity.areaId === null).length,
  );
  const selectedEntry = computed(
    () => entriesStore.entries.find((entry) => entry.entityId === studio.selectedEntityId) ?? null,
  );

  return {
    scopedEntries,
    tree,
    allCategoryPaths,
    currentFolder,
    uncategorizedCount,
    favoriteCount,
    scopeCounts,
    visibleEntries,
    visibleEntities,
    areaNav,
    noAreaCount,
    selectedEntry,
  };
}
