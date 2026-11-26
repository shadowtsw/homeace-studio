<template>
  <DialogFrame :title="t('color.title', { name: lastLevel(path) })" @close="emit('cancel')">
    <p class="folder-color__hint">{{ t("color.hint") }}</p>
    <div class="folder-color__swatches">
      <button
        v-for="color in FOLDER_COLORS"
        :key="color"
        class="folder-color__swatch"
        :class="{ 'folder-color__swatch--on': color === current }"
        type="button"
        :style="{ background: color }"
        :aria-label="color"
        :aria-pressed="color === current"
        @click="emit('pick', color)"
      />
    </div>

    <template #buttons>
      <button class="btn" type="button" :disabled="!current" @click="emit('pick', null)">
        {{ path.includes(CATEGORY_SEPARATOR) ? t("color.inherit") : t("color.default") }}
      </button>
      <button class="btn" type="button" @click="emit('cancel')">{{ t("common.close") }}</button>
    </template>
  </DialogFrame>
</template>

<script setup lang="ts">
import { useI18n } from "vue-i18n";

import DialogFrame from "@/components/common/DialogFrame.vue";
import { CATEGORY_SEPARATOR } from "@/constants/entries";
import { lastLevel } from "@/utils/categories/categoryPath";

/** Folder colors to pick from; chosen to read well on light and dark backgrounds. */
const FOLDER_COLORS = [
  "#c9862f",
  "#e3a64e",
  "#76a43a",
  "#2f9b68",
  "#3a80c2",
  "#6aa6dc",
  "#8a63d2",
  "#c64a4a",
  "#d0659b",
  "#7b8597",
];

defineProps<{
  path: string;
  /** The folder's own color; null when it has none (default or inherited from a parent). */
  current: string | null;
}>();

const emit = defineEmits<{
  cancel: [];
  /** null goes back to the default color. */
  pick: [color: string | null];
}>();

const { t } = useI18n();
</script>

<style scoped>
.folder-color__hint {
  margin: 0;
  color: var(--muted);
}

.folder-color__swatches {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.folder-color__swatch {
  width: 34px;
  height: 34px;
  border: 3px solid transparent;
  border-radius: 10px;
  cursor: pointer;
}

.folder-color__swatch--on {
  border-color: var(--fg);
}
</style>
