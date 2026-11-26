<template>
  <div class="bundle-row__alternatives">
    <template v-if="alternatives.length">
      <span>{{ t("entitySorting.suggestions.rather") }}</span>
      <button
        v-for="path in alternatives"
        :key="path"
        class="bundle-row__chip"
        type="button"
        @click="sorting.pick({ key: bundleKey, target: path })"
      >
        {{ path }}
      </button>
    </template>
    <template v-if="isNaming">
      <input
        ref="nameInput"
        v-model="newName"
        class="field-input bundle-row__pick"
        :placeholder="t('entitySorting.suggestions.newFolderPlaceholder')"
        :aria-label="t('entitySorting.suggestions.newFolder')"
        @keydown.enter.prevent.stop="takeNewName"
        @keydown.escape.stop="isNaming = false"
      />
      <button class="btn btn--sm" type="button" @click="takeNewName">
        {{ t("entitySorting.suggestions.take") }}
      </button>
      <button class="btn btn--sm" type="button" @click="isNaming = false">
        {{ t("entitySorting.rules.cancel") }}
      </button>
    </template>
    <span v-else ref="picker" class="bundle-row__picker">
      <button
        class="bundle-row__pick-button"
        type="button"
        :aria-expanded="isTreeOpen"
        @click="isTreeOpen = !isTreeOpen"
      >
        <span class="mdi mdi-file-tree-outline" />
        {{
          target
            ? t("entitySorting.suggestions.otherFolder")
            : t("entitySorting.suggestions.chooseFolder")
        }}
      </button>
      <FolderTreePanel
        v-if="isTreeOpen"
        class="bundle-row__tree"
        :folders="folderOptions"
        :current="target ?? ''"
        @pick="pickFolder"
        @close="isTreeOpen = false"
      >
        <template #footer>
          <button class="btn btn--sm" type="button" @click="startNaming">
            <span class="mdi mdi-folder-plus-outline" />
            {{ t("entitySorting.suggestions.newFolder") }}
          </button>
        </template>
      </FolderTreePanel>
    </span>
  </div>
</template>

<script setup lang="ts">
import { onClickOutside } from "@vueuse/core";
import { nextTick, ref, useTemplateRef } from "vue";
import { useI18n } from "vue-i18n";

import FolderTreePanel from "@/components/common/FolderTreePanel.vue";
import { useEntitySortingStore } from "@/stores/entitySortingStore";
import { cleanFolderPath } from "@/utils/categories/categoryPath";

/** Another folder for a bundle: one of the alternatives, a folder from the tree, or a new one. */
const props = defineProps<{
  bundleKey: string;
  /** The folder the bundle goes to now; null when it has none. */
  target: string | null;
  /** Other folders worth a click. */
  alternatives: string[];
  /** Existing folders and new ones of this session, for "Anderer Ordner …". */
  folderOptions: string[];
}>();

const { t } = useI18n();
const sorting = useEntitySortingStore();
const isNaming = ref(false);
const isTreeOpen = ref(false);
const picker = useTemplateRef("picker");

onClickOutside(picker, () => (isTreeOpen.value = false));
const newName = ref("");
const nameInput = useTemplateRef("nameInput");

function pickFolder(path: string): void {
  isTreeOpen.value = false;
  sorting.pick({ key: props.bundleKey, target: path });
}

async function startNaming(): Promise<void> {
  isTreeOpen.value = false;
  isNaming.value = true;
  await nextTick();
  nameInput.value?.focus();
}

function takeNewName(): void {
  const path = cleanFolderPath(newName.value);
  if (!path) return;

  sorting.pick({ key: props.bundleKey, target: path });
  isNaming.value = false;
  newName.value = "";
}
</script>

<style scoped>
.bundle-row__alternatives {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px;
  margin-top: 2px;
  color: var(--faint);
  font-size: 12.5px;
}

.bundle-row__chip {
  padding: 1px 9px;
  border: 1px dashed var(--line-strong);
  border-radius: 999px;
  background: transparent;
  color: var(--fg);
  cursor: pointer;
  font-size: 12px;
}

.bundle-row__chip:hover {
  border-color: var(--accent);
  border-style: solid;
  color: var(--accent);
}

.bundle-row__pick {
  width: auto;
  max-width: 220px;
  height: 26px;
  padding: 0 6px;
  font-size: 12px;
}

.bundle-row__picker {
  position: relative;
}

.bundle-row__pick-button {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  height: 26px;
  padding: 0 9px;
  border: 1px solid var(--line-strong);
  border-radius: 7px;
  background: var(--surface-2);
  color: var(--muted);
  cursor: pointer;
  font-size: 12px;
}

.bundle-row__pick-button:hover {
  border-color: var(--accent);
  color: var(--accent);
}

.bundle-row__tree {
  position: absolute;
  top: calc(100% + 4px);
  left: 0;
  z-index: 6;
}
</style>
