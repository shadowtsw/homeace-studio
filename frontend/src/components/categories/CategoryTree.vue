<template>
  <nav class="category-tree" :aria-label="t('nav.categories')">
    <div
      class="category-tree__special"
      :class="{ 'category-tree__special--active': selected === CATEGORY_FILTER.all }"
      @click="emit('select', CATEGORY_FILTER.all)"
    >
      <span class="mdi mdi-apps" />
      <span>{{ t("nav.all") }}</span>
      <span class="category-tree__count">{{ totalCount }}</span>
    </div>

    <div
      class="category-tree__special"
      :class="{ 'category-tree__special--active': selected === CATEGORY_FILTER.favorites }"
      @click="emit('select', CATEGORY_FILTER.favorites)"
    >
      <span class="mdi mdi-star-outline" />
      <span>{{ t("nav.favorites") }}</span>
      <span class="category-tree__count">{{ favoriteCount }}</span>
    </div>

    <div
      class="category-tree__special"
      :class="{ 'category-tree__special--active': selected === CATEGORY_FILTER.checkup }"
      @click="emit('select', CATEGORY_FILTER.checkup)"
    >
      <span class="mdi mdi-shield-check-outline" />
      <span>{{ t("nav.checkup") }}</span>
      <span
        v-if="checkupCount !== null"
        class="category-tree__badge"
        :class="{ 'category-tree__badge--ok': checkupCount === 0 }"
      >
        <span v-if="checkupCount === 0" class="mdi mdi-check" />
        <template v-else>{{ checkupCount }}</template>
      </span>
    </div>

    <div class="category-tree__modes" role="radiogroup" :aria-label="t('areas.view')">
      <button
        v-for="option in NAV_MODES"
        :key="option.mode"
        type="button"
        role="radio"
        :aria-checked="mode === option.mode"
        :class="{ 'category-tree__mode--active': mode === option.mode }"
        @click="emit('update:mode', option.mode)"
      >
        <span class="mdi" :class="option.icon" />{{ t(option.label) }}
      </button>
    </div>

    <!-- The area view brings its own tree. -->
    <slot v-if="mode === NAV_MODE.areas" name="areas" />

    <template v-else>
      <div class="category-tree__heading">
        <span class="category-tree__heading-text">{{ t("nav.categories") }}</span>
        <button
          v-if="hasOwnOrder"
          class="category-tree__add"
          type="button"
          :aria-label="t('nav.resetOrder')"
          :title="t('nav.resetOrder')"
          @click="emit('resetOrder')"
        >
          <span class="mdi mdi-sort-alphabetical-ascending" />
        </button>
        <button
          class="category-tree__add"
          type="button"
          :aria-label="t('nav.newFolder')"
          :title="t('nav.newFolder')"
          @click="emit('addFolder', null)"
        >
          <span class="mdi mdi-folder-plus-outline" />
        </button>
      </div>

      <!-- Hints above the folders, e.g. the tidy-up assistant. -->
      <slot name="notices" />

      <ul class="category-tree__list">
        <CategoryTreeNode
          v-for="node in tree"
          :key="node.path"
          :node="node"
          :depth="0"
          :selected="selected"
          :expanded-paths="expandedPaths"
          :colors="colors"
          :renaming-path="renamingPath"
          @reorder="(moved, target, isBefore) => emit('reorder', moved, target, isBefore)"
          @start-inline-rename="(path) => emit('startInlineRename', path)"
          @rename-inline="(path, name) => emit('renameInline', path, name)"
          @cancel-inline-rename="emit('cancelInlineRename')"
          @select="selectNode"
          @pick-color="(path) => emit('pickColor', path)"
          @toggle="toggleNode"
          @rename="(path) => emit('rename', path)"
          @add-folder="(path) => emit('addFolder', path)"
          @delete-folder="(path) => emit('deleteFolder', path)"
          @drop-entry="(path, entityId) => emit('dropEntry', path, entityId)"
          @drop-entity="(path, entityId) => emit('dropEntity', path, entityId)"
        />
      </ul>

      <div
        class="category-tree__special"
        :class="{
          'category-tree__special--active': selected === CATEGORY_FILTER.uncategorized,
          'category-tree__special--drop': isDropOverUncategorized,
        }"
        @click="emit('select', CATEGORY_FILTER.uncategorized)"
        @dragover="onDragOver"
        @dragleave="onDragLeave"
        @drop="onDrop"
      >
        <span class="mdi mdi-folder-off-outline" />
        <span>{{ t("nav.uncategorized") }}</span>
        <span class="category-tree__count">{{ uncategorizedCount }}</span>
      </div>
    </template>
  </nav>
</template>

<script setup lang="ts">
import { ref, watch } from "vue";
import { useI18n } from "vue-i18n";

import { useEntryDropTarget } from "@/composables/dragDrop/useEntryDropTarget";
import { CATEGORY_FILTER, CATEGORY_SEPARATOR, NAV_MODE, type NavMode } from "@/constants/entries";
import type { CategoryNode } from "@/utils/categories/categoryTree";
import { isSpecialCategory } from "@/utils/entries/entryFilter";

import CategoryTreeNode from "./CategoryTreeNode.vue";

const props = defineProps<{
  tree: CategoryNode[];
  selected: string;
  totalCount: number;
  uncategorizedCount: number;
  favoriteCount: number;
  /** Findings of the check-up; null while not loaded yet. */
  checkupCount: number | null;
  colors: Record<string, string>;
  /** Folders (HA categories) or areas; the special nodes on top stay in both. */
  mode: NavMode;
  /** The folder whose name is an input right now (double click). */
  renamingPath: string | null;
  /** The user sorted folders by hand; "A–Z" brings the default back. */
  hasOwnOrder: boolean;
}>();

const emit = defineEmits<{
  select: [path: string];
  rename: [path: string];
  startInlineRename: [path: string];
  renameInline: [path: string, name: string];
  cancelInlineRename: [];
  reorder: [moved: string, target: string, isBefore: boolean];
  resetOrder: [];
  /** `parent` null: a new top-level folder. */
  addFolder: [parent: string | null];
  deleteFolder: [path: string];
  pickColor: [path: string];
  /** `path` null: the entry was dropped on "Ohne Kategorie". */
  dropEntry: [path: string | null, entityId: string];
  /** A plain entity was dropped on a folder; `path` null: on "Ohne Kategorie". */
  dropEntity: [path: string | null, entityId: string];
  "update:mode": [mode: NavMode];
}>();

const NAV_MODES = [
  { mode: NAV_MODE.folders, icon: "mdi-folder-outline", label: "areas.viewFolders" },
  { mode: NAV_MODE.areas, icon: "mdi-map-marker-outline", label: "areas.viewAreas" },
] as const;

const { t } = useI18n();
const {
  isDropOver: isDropOverUncategorized,
  onDragOver,
  onDragLeave,
  onDrop,
} = useEntryDropTarget({
  onEntryDropped: (entityId) => emit("dropEntry", null, entityId),
  onPlainEntityDropped: (entityId) => emit("dropEntity", null, entityId),
});

/** Which folders are open is pure UI state of this tree. */
const expandedPaths = ref(new Set<string>());

function toggleNode(path: string): void {
  const next = new Set(expandedPaths.value);

  if (next.has(path)) {
    next.delete(path);
  } else {
    next.add(path);
  }

  expandedPaths.value = next;
}

/** A folder selected from elsewhere (a new folder, the list) opens the tree down to it. */
watch(
  () => props.selected,
  (path) => {
    if (isSpecialCategory(path)) return;

    const levels = path.split(CATEGORY_SEPARATOR);
    const next = new Set(expandedPaths.value);

    for (let depth = 1; depth <= levels.length; depth++) {
      next.add(levels.slice(0, depth).join(CATEGORY_SEPARATOR));
    }

    expandedPaths.value = next;
  },
);

/** Selecting a folder also opens it, so its subfolders become visible. */
function selectNode(path: string): void {
  expandedPaths.value = new Set(expandedPaths.value).add(path);
  emit("select", path);
}
</script>

<style scoped>
.category-tree {
  display: grid;
  gap: 2px;
}

.category-tree__modes {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 2px;
  margin: 12px 2px 0;
  padding: 3px;
  border-radius: 10px;
  background: var(--sunken);
}

.category-tree__modes button {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 5px;
  height: 28px;
  border: 0;
  border-radius: 7px;
  background: none;
  color: var(--muted);
  cursor: pointer;
  font: inherit;
  font-size: 12.5px;
  font-weight: 600;
}

.category-tree__modes .mdi {
  font-size: 15px;
}

.category-tree__modes .category-tree__mode--active {
  background: var(--surface);
  color: var(--fg);
  box-shadow: 0 1px 2px rgb(0 0 0 / 12%);
}

.category-tree__heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin: 16px 6px 6px;
  color: var(--faint);
  font-size: 11.5px;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.category-tree__add {
  display: grid;
  place-items: center;
  width: 24px;
  height: 24px;
  padding: 0;
  border: 0;
  border-radius: 6px;
  background: none;
  color: var(--faint);
  cursor: pointer;
  font-size: 17px;
}

.category-tree__add:hover {
  background: var(--line);
  color: var(--fg);
}

.category-tree__list {
  margin: 0;
  padding: 0;
  list-style: none;
}

.category-tree__special {
  display: flex;
  align-items: center;
  gap: 9px;
  height: 32px;
  padding: 0 8px;
  border-radius: var(--radius-sm);
  color: var(--muted);
  cursor: pointer;
}

.category-tree__special .mdi {
  color: var(--faint);
  font-size: 17px;
}

.category-tree__special > span:nth-child(2) {
  flex: 1;
}

.category-tree__special:hover {
  background: var(--sunken);
}

.category-tree__special--active {
  background: var(--surface);
  color: var(--fg);
  font-weight: 600;
  box-shadow: inset 0 0 0 1px var(--line-strong);
}

.category-tree__special--drop {
  background: var(--accent-soft);
  box-shadow: inset 0 0 0 2px var(--accent);
}

.category-tree__badge {
  display: grid;
  place-items: center;
  min-width: 20px;
  height: 20px;
  padding: 0 6px;
  border-radius: 999px;
  background: var(--warn-soft);
  color: var(--warn);
  font-size: 11.5px;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
}

.category-tree__badge--ok {
  background: var(--ok-soft);
  color: var(--ok);
}

.category-tree__count {
  color: var(--faint);
  font-size: 12px;
  font-weight: 400;
  font-variant-numeric: tabular-nums;
}

.category-tree__heading-text {
  flex: 1;
}
</style>
