<template>
  <div ref="root" class="folder-path-field">
    <div class="folder-path-field__row">
      <input
        ref="input"
        v-model="path"
        class="field-input folder-path-field__input"
        :placeholder="placeholder"
        :aria-label="label"
        role="combobox"
        :aria-expanded="suggestions.length > 0"
        autocomplete="off"
        @focus="isTyping = true"
        @input="onInput"
        @keydown="onKey"
      />
      <button
        class="btn btn--sm folder-path-field__open"
        type="button"
        :aria-expanded="isTreeOpen"
        :title="t('folderPicker.open')"
        @click="isTreeOpen ? (isTreeOpen = false) : openTree()"
      >
        <span class="mdi mdi-file-tree-outline" />{{ t("folderPicker.open") }}
      </button>
    </div>

    <ul v-if="suggestions.length" class="folder-path-field__suggestions" role="listbox">
      <li
        v-for="(folder, index) in suggestions"
        :key="folder"
        role="option"
        :aria-selected="index === active"
        :class="{ 'folder-path-field__suggestion--active': index === active }"
        @mousedown.prevent="pick(folder)"
        @mousemove="active = index"
      >
        <span class="mdi mdi-folder-outline" />
        <span>
          {{ split(folder).before }}<mark>{{ split(folder).match }}</mark
          >{{ split(folder).after }}
        </span>
      </li>
    </ul>

    <FolderTreePanel
      v-if="isTreeOpen"
      class="folder-path-field__panel"
      :folders="folders"
      :current="path"
      @pick="pick"
      @close="isTreeOpen = false"
    />
  </div>
</template>

<script setup lang="ts">
import { onClickOutside } from "@vueuse/core";
import { computed, nextTick, ref, useTemplateRef } from "vue";
import { useI18n } from "vue-i18n";

import FolderTreePanel from "./FolderTreePanel.vue";

/**
 * A folder path to type or to pick from the folder tree, in HomeAce's look. While typing, matching
 * folders show below (↑↓ and Enter); "Aus dem Baum …" opens the tree. With `appendsSeparator` a "/"
 * follows a picked folder, so the user can go on typing or add a placeholder.
 */
const props = defineProps<{
  folders: readonly string[];
  label: string;
  placeholder?: string;
  appendsSeparator?: boolean;
}>();

const path = defineModel<string>({ required: true });

const MAX_SUGGESTIONS = 8;

const { t } = useI18n();
const root = useTemplateRef("root");
const input = useTemplateRef("input");
const isTreeOpen = ref(false);
/** The list shows only while the user types, not when the field just has a value. */
const isTyping = ref(false);
const active = ref(-1);

/** The part of the path being typed: what follows the last "/" of a known folder, or all of it. */
const needle = computed(() => path.value.trim().toLowerCase());

const suggestions = computed(() => {
  if (!isTyping.value || !needle.value) return [];

  return props.folders
    .filter(
      (folder) =>
        folder.toLowerCase().includes(needle.value) && folder.toLowerCase() !== needle.value,
    )
    .sort((first, second) => rank(first) - rank(second) || first.localeCompare(second))
    .slice(0, MAX_SUGGESTIONS);
});

/** Folders starting with what is typed come first. */
function rank(folder: string): number {
  return folder.toLowerCase().startsWith(needle.value) ? 0 : 1;
}

function split(folder: string): { before: string; match: string; after: string } {
  const start = folder.toLowerCase().indexOf(needle.value);
  if (start < 0) return { before: folder, match: "", after: "" };

  const end = start + needle.value.length;
  return {
    before: folder.slice(0, start),
    match: folder.slice(start, end),
    after: folder.slice(end),
  };
}

function onInput(): void {
  isTyping.value = true;
  active.value = -1;
}

function onKey(event: KeyboardEvent): void {
  if (!suggestions.value.length) return;

  if (event.key === "ArrowDown" || event.key === "ArrowUp") {
    const step = event.key === "ArrowDown" ? 1 : -1;
    const count = suggestions.value.length;
    active.value = (active.value + step + count) % count;
  } else if (event.key === "Enter" && active.value >= 0) {
    pick(suggestions.value[active.value] as string);
  } else if (event.key === "Escape") {
    isTyping.value = false;
  } else {
    return;
  }
  // The list handled it: no form submit, no closing of the window around.
  event.preventDefault();
  event.stopPropagation();
}

async function openTree(): Promise<void> {
  isTyping.value = false;
  isTreeOpen.value = true;
}

async function pick(folder: string): Promise<void> {
  path.value = props.appendsSeparator ? `${folder}/` : folder;
  isTreeOpen.value = false;
  isTyping.value = false;
  active.value = -1;
  await nextTick();
  const element = input.value;
  element?.focus();
  element?.setSelectionRange(path.value.length, path.value.length);
}

onClickOutside(root, () => {
  isTreeOpen.value = false;
  isTyping.value = false;
});

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

.folder-path-field__suggestions,
.folder-path-field__panel {
  position: absolute;
  top: calc(100% + 4px);
  left: 0;
  z-index: 5;
}

.folder-path-field__suggestions {
  width: min(420px, 100%);
  min-width: 240px;
  margin: 0;
  padding: 6px;
  list-style: none;
  border: 1px solid var(--line-strong);
  border-radius: 12px;
  background: var(--surface);
  box-shadow: var(--shadow);
}

.folder-path-field__suggestions li {
  display: flex;
  align-items: center;
  gap: 6px;
  height: 30px;
  padding: 0 8px;
  border-radius: 6px;
  cursor: pointer;
}

.folder-path-field__suggestions .mdi {
  color: var(--faint);
}

.folder-path-field__suggestions mark {
  background: none;
  color: var(--accent);
  font-weight: 700;
}

.folder-path-field__suggestion--active {
  background: var(--accent-soft);
}
</style>
