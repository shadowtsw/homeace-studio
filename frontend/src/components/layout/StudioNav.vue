<template>
  <CategoryTree
    :tree="data.tree.value"
    :selected="studio.category"
    :total-count="data.scopedEntries.value.length"
    :uncategorized-count="data.uncategorizedCount.value"
    :favorite-count="data.favoriteCount.value"
    :checkup-count="checkup.hasLoaded ? checkup.findings.length : null"
    :colors="foldersStore.colors"
    :mode="layout.navMode"
    :renaming-path="actions.inlineRenamingPath.value"
    :has-own-order="Object.keys(foldersStore.order).length > 0"
    @reorder="reorderFolder"
    @reset-order="actions.resetOrder"
    @start-inline-rename="actions.startInlineRename"
    @rename-inline="(path, name) => actions.renameInline({ path, name })"
    @cancel-inline-rename="actions.cancelInlineRename"
    @update:mode="setNavMode"
    @select="(path) => emit('select', path)"
    @rename="actions.startRename"
    @drop-entry="dropEntry"
    @drop-entity="dropEntity"
    @add-folder="create.startFolder"
    @delete-folder="create.deleteFolder"
    @pick-color="(path) => emit('pickColor', path)"
  >
    <template #notices>
      <AiPlanHint />
      <CleanupHint v-if="cleanup.isHintVisible" />
    </template>
    <template #areas>
      <AreaNav
        :areas="data.areaNav.value"
        :no-area-count="data.noAreaCount.value"
        :loose-count="looseAreaCount"
        :selected="studio.category"
        :has-loaded="entryAreas.hasLoaded"
        @select="(path) => emit('select', path)"
        @tidy="actions.startAreaTidy"
        @create="areas.startCreate((area) => emit('select', areaFilter(area.areaId)))"
        @edit="(areaId) => withArea({ areaId, action: areas.startEdit })"
        @delete="(areaId) => withArea({ areaId, action: areas.startDelete })"
        @drop-entry="dropOnArea"
        @rename-area="(areaId, name) => areaActions.renameArea({ areaId, name })"
      />
    </template>
  </CategoryTree>
</template>

<script setup lang="ts">
import { computed } from "vue";

import AiPlanHint from "@/components/ai/AiPlanHint.vue";
import AreaNav from "@/components/areas/AreaNav.vue";
import CategoryTree from "@/components/categories/CategoryTree.vue";
import CleanupHint from "@/components/cleanup/CleanupHint.vue";
import type { useAreaActions } from "@/composables/actions/useAreaActions";
import type { useCategoryActions } from "@/composables/actions/useCategoryActions";
import type { useCreateActions } from "@/composables/actions/useCreateActions";
import type { useEntityBulkMove } from "@/composables/actions/useEntityBulkMove";
import type { useStudioData } from "@/composables/useStudioData";
import { CATEGORY_FILTER, NAV_MODE, type NavMode } from "@/constants/entries";
import { useAreasStore } from "@/stores/areasStore";
import { useCheckupStore } from "@/stores/checkupStore";
import { useCleanupStore } from "@/stores/cleanupStore";
import { useEntriesStore } from "@/stores/entriesStore";
import { useEntryAreasStore } from "@/stores/entryAreasStore";
import { useFoldersStore } from "@/stores/foldersStore";
import { useLayoutStore } from "@/stores/layoutStore";
import { useLookupsStore } from "@/stores/lookupsStore";
import { useStudioStore } from "@/stores/studioStore";
import type { Area } from "@/types/entry";
import { tidyCandidates } from "@/utils/areas/areaTidy";
import type { CategoryNode } from "@/utils/categories/categoryTree";
import { moveSibling, parentOf } from "@/utils/categories/folderOrder";
import { areaFilter, areaOfFilter } from "@/utils/entries/entryFilter";

/** The navigation column: folders or areas, with drops onto them, folder order and renaming. */
const props = defineProps<{
  data: ReturnType<typeof useStudioData>;
  actions: ReturnType<typeof useCategoryActions>;
  create: ReturnType<typeof useCreateActions>;
  areaActions: ReturnType<typeof useAreaActions>;
  /** Several ticked entities into a folder at once. */
  entityMove: ReturnType<typeof useEntityBulkMove>;
}>();

const emit = defineEmits<{
  /** A folder, an area or a filter was picked. */
  select: [path: string];
  /** The color dialog of a folder should open. */
  pickColor: [path: string];
}>();

const studio = useStudioStore();
const layout = useLayoutStore();
const checkup = useCheckupStore();
const cleanup = useCleanupStore();
const foldersStore = useFoldersStore();
const entriesStore = useEntriesStore();
const entryAreas = useEntryAreasStore();
const areas = useAreasStore();
const lookups = useLookupsStore();

function withArea({ areaId, action }: { areaId: string; action: (area: Area) => void }): void {
  const area = lookups.areas.find((item) => item.areaId === areaId);
  if (area) action(area);
}

/** Dropping a ticked row gives every ticked row the area; any other row gets it alone. */
function dropOnArea(areaId: string | null, entityId: string): void {
  const ids =
    studio.checkedIds.has(entityId) && studio.checkedIds.size > 1
      ? [...studio.checkedIds]
      : [entityId];
  void props.areaActions.setOwnArea({ entityIds: ids, areaId });
}

/**
 * Switching to the areas opens the first one; back to the folders, an area selection becomes "all".
 */
function setNavMode(mode: NavMode): void {
  layout.navMode = mode;

  if (mode === NAV_MODE.areas) {
    const first = props.data.areaNav.value[0];
    emit("select", first ? areaFilter(first.areaId) : areaFilter(null));
  } else if (areaOfFilter(studio.category) !== undefined) {
    emit("select", CATEGORY_FILTER.all);
  }
}

/**
 * Entries without a folder that have an area; "Ordnung in einem Klick" shows when there are any.
 */
const looseAreaCount = computed(
  () =>
    tidyCandidates({ entries: entriesStore.entries, linksOf: entryAreas.linksOf }).filter(
      (entry) => entry.categoryPath === null,
    ).length,
);

/** Dropping a ticked row moves every ticked row; any other row moves alone. */
function dropEntry(path: string | null, entityId: string): void {
  if (studio.checkedIds.has(entityId) && studio.checkedIds.size > 1) {
    void props.actions.moveEntries({ entityIds: [...studio.checkedIds], categoryPath: path });
  } else {
    void props.actions.moveEntry({ entityId, categoryPath: path });
  }
}

/** A ticked entity dropped on a folder takes all ticked ones along, like entries do. */
function dropEntity(path: string | null, entityId: string): void {
  if (studio.checkedEntityIds.has(entityId) && studio.checkedEntityIds.size > 1) {
    void props.entityMove.move({ entityIds: [...studio.checkedEntityIds], categoryPath: path });
  } else {
    void props.actions.moveEntity({ entityId, categoryPath: path });
  }
}

/** A folder dropped before or after a sibling: the whole sibling list is saved in that order. */
function reorderFolder(moved: string, target: string, isBefore: boolean): void {
  const parent = parentOf(moved);
  const find = (nodes: CategoryNode[]): CategoryNode[] | null => {
    if (parent === "") return nodes;
    for (const node of nodes) {
      if (node.path === parent) return node.children;
      const found = find(node.children);
      if (found) return found;
    }
    return null;
  };
  const siblings = (find(props.data.tree.value) ?? []).map((node) => node.path);
  const previous = foldersStore.order[parent] ?? [];
  void props.actions.saveOrder({
    parent,
    order: moveSibling({ siblings, moved, target, isBefore }),
    previous: [...previous],
  });
}
</script>
