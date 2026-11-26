<template>
  <div ref="root" class="folder-path-field">
    <div class="folder-path-field__row">
      <input
        ref="input"
        v-model="path"
        class="field-input folder-path-field__input"
        :list="listId"
        :placeholder="placeholder"
        :aria-label="label"
        autocomplete="off"
      />
      <datalist :id="listId">
        <option v-for="folder in folders" :key="folder" :value="folder" />
      </datalist>
      <button
        class="btn btn--sm folder-path-field__open"
        type="button"
        :aria-expanded="isOpen"
        :title="t('folderPicker.open')"
        @click="toggle"
      >
        <span class="mdi mdi-file-tree-outline" />{{ t("folderPicker.open") }}
      </button>
    </div>

    <div
      v-if="isOpen"
      class="folder-path-field__panel"
      role="dialog"
      :aria-label="t('folderPicker.title')"
      @keydown.escape.stop="close"
    >
      <div class="folder-path-field__head">
        <input
          ref="search"
          v-model="query"
          class="field-input"
          type="search"
          :placeholder="t('folderPicker.search')"
          :aria-label="t('folderPicker.search')"
        />
        <PopoverClose @close="close" />
      </div>
      <ul class="folder-path-field__tree">
        <li
          v-for="row in rows"
          :key="row.node.path"
          :style="{ paddingLeft: `${row.depth * 16}px` }"
        >
          <button
            v-if="row.node.children.length && !query"
            class="folder-path-field__toggle"
            type="button"
            :aria-label="
              expanded.has(row.node.path) ? t('folderPicker.collapse') : t('folderPicker.expand')
            "
            @click="toggleNode(row.node.path)"
          >
            <span
              class="mdi"
              :class="expanded.has(row.node.path) ? 'mdi-chevron-down' : 'mdi-chevron-right'"
            />
          </button>
          <span v-else class="folder-path-field__spacer" />
          <button class="folder-path-field__folder" type="button" @click="pick(row.node.path)">
            <span class="mdi mdi-folder-outline" />
            <span>{{ query ? row.node.path : row.node.name }}</span>
          </button>
        </li>
        <li v-if="!rows.length" class="folder-path-field__empty">{{ t("folderPicker.none") }}</li>
      </ul>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onClickOutside } from "@vueuse/core";
import { computed, nextTick, ref, useId, useTemplateRef } from "vue";
import { useI18n } from "vue-i18n";

import { buildCategoryTree, type CategoryNode } from "@/utils/categoryTree";

import PopoverClose from "./PopoverClose.vue";

/**
 * A folder path to type or to pick from the folder tree. Picking fills the path; with
 * `appendsSeparator` a "/" follows, so the user can go on typing (or add a placeholder).
 */
const props = defineProps<{
  folders: readonly string[];
  label: string;
  placeholder?: string;
  appendsSeparator?: boolean;
}>();

const path = defineModel<string>({ required: true });

const { t } = useI18n();
const listId = useId();
const root = useTemplateRef("root");
const input = useTemplateRef("input");
const searchInput = useTemplateRef("search");
const isOpen = ref(false);
const query = ref("");
const expanded = ref(new Set<string>());

const tree = computed(() => buildCategoryTree([], [], props.folders));

type Row = { node: CategoryNode; depth: number };

/** Visible rows: the open branches, or every match while searching. */
const rows = computed<Row[]>(() => {
  const result: Row[] = [];
  const needle = query.value.trim().toLowerCase();
  const walk = (nodes: CategoryNode[], depth: number): void => {
    for (const node of nodes) {
      if (needle) {
        if (node.path.toLowerCase().includes(needle)) result.push({ node, depth: 0 });
        walk(node.children, depth + 1);
      } else {
        result.push({ node, depth });
        if (expanded.value.has(node.path)) walk(node.children, depth + 1);
      }
    }
  };
  walk(tree.value, 0);

  return result;
});

async function toggle(): Promise<void> {
  if (isOpen.value) return close();

  isOpen.value = true;
  query.value = "";
  // Open the branch of what is typed already, so the user sees where it is.
  const levels = path.value.split("/").filter(Boolean);
  expanded.value = new Set(levels.map((_, index) => levels.slice(0, index + 1).join("/")));
  await nextTick();
  searchInput.value?.focus();
}

function close(): void {
  isOpen.value = false;
}

function toggleNode(nodePath: string): void {
  const next = new Set(expanded.value);
  if (!next.delete(nodePath)) next.add(nodePath);
  expanded.value = next;
}

async function pick(nodePath: string): Promise<void> {
  path.value = props.appendsSeparator ? `${nodePath}/` : nodePath;
  close();
  await nextTick();
  const element = input.value;
  element?.focus();
  element?.setSelectionRange(path.value.length, path.value.length);
}

onClickOutside(root, close);

/** For callers that insert at the cursor (placeholders). */
defineExpose({ input });
</script>

<style scoped>
.folder-path-field {
  position: relative;
  flex: 1 1 220px;
  min-width: 0;
}

.folder-path-field__row {
  display: flex;
  gap: 6px;
}

.folder-path-field__input {
  flex: 1;
  min-width: 0;
}

.folder-path-field__open {
  height: 36px;
}

.folder-path-field__panel {
  position: absolute;
  top: calc(100% + 4px);
  left: 0;
  z-index: 5;
  display: grid;
  gap: 8px;
  width: min(420px, 100%);
  min-width: 260px;
  max-height: 340px;
  padding: 10px;
  overflow: hidden;
  border: 1px solid var(--line-strong);
  border-radius: 12px;
  background: var(--surface);
  box-shadow: var(--shadow);
  grid-template-rows: auto minmax(0, 1fr);
}

.folder-path-field__head {
  display: flex;
  align-items: center;
  gap: 8px;
}

.folder-path-field__tree {
  margin: 0;
  padding: 0;
  overflow: auto;
  list-style: none;
}

.folder-path-field__tree li {
  display: flex;
  align-items: center;
  gap: 2px;
}

.folder-path-field__toggle,
.folder-path-field__spacer {
  display: grid;
  flex: none;
  place-items: center;
  width: 24px;
  height: 28px;
  border: 0;
  background: none;
  color: var(--faint);
  cursor: pointer;
}

.folder-path-field__folder {
  display: flex;
  flex: 1;
  align-items: center;
  gap: 6px;
  min-width: 0;
  height: 28px;
  padding: 0 6px;
  border: 0;
  border-radius: 6px;
  background: none;
  cursor: pointer;
  text-align: left;
}

.folder-path-field__folder:hover,
.folder-path-field__folder:focus-visible {
  background: var(--accent-soft);
  color: var(--accent);
}

.folder-path-field__folder .mdi {
  color: var(--faint);
}

.folder-path-field__empty {
  padding: 6px;
  color: var(--muted);
}
</style>
