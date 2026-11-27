<template>
  <li>
    <div
      class="category-tree-node"
      :class="{
        'category-tree-node--active': selected === node.path,
        'category-tree-node--drop': isDropOver,
        'category-tree-node--empty': isEmptyHere,
        'category-tree-node--before': sortDrop === 'before',
        'category-tree-node--after': sortDrop === 'after',
      }"
      :style="{ '--depth': depth }"
      :draggable="renamingPath !== node.path"
      @dragstart="startFolderDrag"
      @dragend="draggedFolder = null"
      :title="node.isFolderOnly ? t('nav.folderOnly') : undefined"
      @click="emit('select', node.path)"
      @dragover="onAnyDragOver"
      @dragleave="onAnyDragLeave"
      @drop="onAnyDrop"
    >
      <button
        class="category-tree-node__twisty"
        :class="{ 'category-tree-node__twisty--hidden': !hasChildren }"
        type="button"
        tabindex="-1"
        :aria-label="isExpanded ? t('nav.collapse') : t('nav.expand')"
        @click.stop="emit('toggle', node.path)"
      >
        <span class="mdi" :class="isExpanded ? 'mdi-chevron-down' : 'mdi-chevron-right'" />
      </button>
      <span
        class="mdi category-tree-node__icon"
        :class="node.isFolderOnly ? 'mdi-folder-outline' : 'mdi-folder'"
        :style="color ? { color } : undefined"
      />
      <InlineNameInput
        v-if="renamingPath === node.path"
        class="category-tree-node__rename"
        :value="node.name"
        :label="t('nav.rename', { name: node.name })"
        @save="(name) => emit('renameInline', node.path, name)"
        @cancel="emit('cancelInlineRename')"
      />
      <span
        v-else
        class="category-tree-node__name"
        @dblclick.stop="emit('startInlineRename', node.path)"
        >{{ node.name }}</span
      >
      <span class="category-tree-node__count">{{ node.totalCount }}</span>
      <span class="category-tree-node__actions">
        <button
          class="category-tree-node__action"
          type="button"
          :aria-label="t('nav.newSubfolder', { name: node.name })"
          :title="t('nav.newSubfolder', { name: node.name })"
          @click.stop="emit('addFolder', node.path)"
        >
          <span class="mdi mdi-folder-plus-outline" />
        </button>
        <button
          class="category-tree-node__action"
          type="button"
          :aria-label="t('nav.color', { name: node.name })"
          :title="t('nav.color', { name: node.name })"
          @click.stop="emit('pickColor', node.path)"
        >
          <span class="mdi mdi-palette-outline" />
        </button>
        <button
          class="category-tree-node__action"
          type="button"
          :aria-label="t('nav.rename', { name: node.name })"
          :title="t('nav.rename', { name: node.name })"
          @click.stop="emit('rename', node.path)"
        >
          <span class="mdi mdi-pencil-outline" />
        </button>
        <button
          v-if="canDelete"
          class="category-tree-node__action"
          type="button"
          :aria-label="t('nav.deleteFolder', { name: node.name })"
          :title="t('nav.deleteFolder', { name: node.name })"
          @click.stop="emit('deleteFolder', node.path)"
        >
          <span class="mdi mdi-delete-outline" />
        </button>
      </span>
    </div>

    <ul v-if="hasChildren && isExpanded" class="category-tree-node__children">
      <CategoryTreeNode
        v-for="child in node.children"
        :key="child.path"
        :node="child"
        :depth="depth + 1"
        :selected="selected"
        :expanded-paths="expandedPaths"
        :colors="colors"
        :renaming-path="renamingPath"
        @reorder="(moved, target, isBefore) => emit('reorder', moved, target, isBefore)"
        @start-inline-rename="(path) => emit('startInlineRename', path)"
        @rename-inline="(path, name) => emit('renameInline', path, name)"
        @cancel-inline-rename="emit('cancelInlineRename')"
        @select="(path) => emit('select', path)"
        @pick-color="(path) => emit('pickColor', path)"
        @toggle="(path) => emit('toggle', path)"
        @rename="(path) => emit('rename', path)"
        @add-folder="(path) => emit('addFolder', path)"
        @delete-folder="(path) => emit('deleteFolder', path)"
        @drop-entry="(path, entityId) => emit('dropEntry', path, entityId)"
        @drop-entity="(path, entityId) => emit('dropEntity', path, entityId)"
      />
    </ul>
  </li>
</template>

<script setup lang="ts">
import { computed, ref } from "vue";
import { useI18n } from "vue-i18n";

import InlineNameInput from "@/components/common/InlineNameInput.vue";

import { useEntryDropTarget } from "@/composables/useEntryDropTarget";
import { draggedFolder, FOLDER_DRAG_TYPE } from "@/composables/useFolderDrag";
import { folderColor } from "@/utils/categoryPath";
import { isEmptyInFilter, type CategoryNode } from "@/utils/categoryTree";
import { parentOf } from "@/utils/folderOrder";

const props = defineProps<{
  node: CategoryNode;
  depth: number;
  selected: string;
  expandedPaths: ReadonlySet<string>;
  /** Folder path to "#rrggbb" (own colors, overlay). */
  colors: Record<string, string>;
  /** The folder whose name is an input right now (double click). */
  renamingPath: string | null;
}>();

const emit = defineEmits<{
  select: [path: string];
  toggle: [path: string];
  rename: [path: string];
  startInlineRename: [path: string];
  renameInline: [path: string, name: string];
  cancelInlineRename: [];
  addFolder: [parent: string];
  deleteFolder: [path: string];
  pickColor: [path: string];
  dropEntry: [path: string, entityId: string];
  /** A plain entity (light, sensor …) was dropped here. */
  dropEntity: [path: string, entityId: string];
  /** A folder was dropped before or after this one (same parent). */
  reorder: [moved: string, target: string, isBefore: boolean];
}>();

const { t } = useI18n();
const { isDropOver, onDragOver, onDragLeave, onDrop } = useEntryDropTarget(
  (entityId) => emit("dropEntry", props.node.path, entityId),
  (entityId) => emit("dropEntity", props.node.path, entityId),
);

/** Where a dragged sibling folder would land: a line above or below this one. */
const sortDrop = ref<"before" | "after" | null>(null);

function startFolderDrag(event: DragEvent): void {
  if (!event.dataTransfer) return;
  event.stopPropagation();
  event.dataTransfer.effectAllowed = "move";
  event.dataTransfer.setData(FOLDER_DRAG_TYPE, props.node.path);
  draggedFolder.value = props.node.path;
}

function isSortableHere(): boolean {
  const moved = draggedFolder.value;
  return (
    moved !== null && moved !== props.node.path && parentOf(moved) === parentOf(props.node.path)
  );
}

function onAnyDragOver(event: DragEvent): void {
  if (draggedFolder.value === null) {
    onDragOver(event);
    return;
  }
  if (!isSortableHere()) return;

  event.preventDefault();
  event.stopPropagation();
  const box = (event.currentTarget as HTMLElement).getBoundingClientRect();
  sortDrop.value = event.clientY < box.top + box.height / 2 ? "before" : "after";
}

function onAnyDragLeave(): void {
  sortDrop.value = null;
  onDragLeave();
}

function onAnyDrop(event: DragEvent): void {
  const moved = draggedFolder.value;
  const position = sortDrop.value;
  sortDrop.value = null;

  if (moved === null) {
    onDrop(event);
    return;
  }
  event.preventDefault();
  event.stopPropagation();
  draggedFolder.value = null;
  if (position && isSortableHereFor(moved))
    emit("reorder", moved, props.node.path, position === "before");
}

function isSortableHereFor(moved: string): boolean {
  return moved !== props.node.path && parentOf(moved) === parentOf(props.node.path);
}

const hasChildren = computed(() => props.node.children.length > 0);
/** Own color, or the one inherited from the nearest colored parent folder. */
const color = computed(() => folderColor(props.node.path, props.colors));
const isExpanded = computed(() => props.expandedPaths.has(props.node.path));
/** Nothing in the chosen filter: faded, but it still opens and takes dropped entries. */
const isEmptyHere = computed(() => isEmptyInFilter(props.node));

/** Only a user's empty folder can be deleted; folders with entries vanish with their last entry. */
const canDelete = computed(
  () =>
    props.node.isSavedFolder &&
    !props.node.isCategory &&
    props.node.totalCount === 0 &&
    !hasChildren.value,
);
</script>

<style scoped>
.category-tree-node__children {
  margin: 0;
  padding: 0;
  list-style: none;
}

.category-tree-node {
  display: flex;
  align-items: center;
  gap: 6px;
  height: 32px;
  padding: 0 4px 0 calc(4px + var(--depth) * 16px);
  border-radius: var(--radius-sm);
  cursor: pointer;
  user-select: none;
}

.category-tree-node:hover {
  background: var(--sunken);
}

/* Empty in the scope shown, but used in another one: still there, just quieter. */
.category-tree-node--empty .category-tree-node__name,
.category-tree-node--empty .category-tree-node__count,
.category-tree-node--empty .category-tree-node__icon {
  opacity: 0.5;
}

.category-tree-node--active {
  background: var(--surface);
  box-shadow: inset 0 0 0 1px var(--line-strong);
}

.category-tree-node--active .category-tree-node__name {
  font-weight: 600;
}

.category-tree-node--drop {
  background: var(--accent-soft);
  box-shadow: inset 0 0 0 2px var(--accent);
}

.category-tree-node__twisty,
.category-tree-node__action {
  display: grid;
  place-items: center;
  width: 22px;
  height: 22px;
  padding: 0;
  border: 0;
  border-radius: 5px;
  background: none;
  color: var(--faint);
  cursor: pointer;
  font-size: 17px;
}

.category-tree-node__twisty:hover,
.category-tree-node__action:hover {
  background: var(--line);
  color: var(--fg);
}

.category-tree-node__twisty--hidden {
  visibility: hidden;
}

/* The actions replace the count on hover; on touch both stay visible. */
.category-tree-node__actions {
  display: none;
  gap: 1px;
}

/* Shown on hover, and always on the selected folder, so they can be found. */
.category-tree-node:hover .category-tree-node__actions,
.category-tree-node:focus-within .category-tree-node__actions,
.category-tree-node--active .category-tree-node__actions {
  display: flex;
}

.category-tree-node:hover .category-tree-node__count,
.category-tree-node--active .category-tree-node__count {
  display: none;
}

.category-tree-node__actions .category-tree-node__action {
  color: var(--muted);
}

.category-tree-node__actions .category-tree-node__action:hover,
.category-tree-node__actions .category-tree-node__action:focus-visible {
  background: var(--accent-soft);
  color: var(--accent);
}

.category-tree-node__icon {
  color: var(--faint);
  font-size: 17px;
}

.category-tree-node__name {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
}

.category-tree-node__count {
  min-width: 22px;
  padding-right: 4px;
  color: var(--faint);
  font-size: 12px;
  font-variant-numeric: tabular-nums;
  text-align: right;
}

@media (hover: none) {
  .category-tree-node__actions {
    display: flex;
  }

  .category-tree-node:hover .category-tree-node__count {
    display: inline;
  }
}

@media (pointer: coarse) {
  .category-tree-node {
    height: 40px;
  }

  .category-tree-node__twisty,
  .category-tree-node__action {
    width: 32px;
    height: 32px;
  }
}

.category-tree-node__rename {
  flex: 1;
  height: 26px;
}

.category-tree-node--before {
  box-shadow: inset 0 2px 0 var(--accent);
}

.category-tree-node--after {
  box-shadow: inset 0 -2px 0 var(--accent);
}
</style>
