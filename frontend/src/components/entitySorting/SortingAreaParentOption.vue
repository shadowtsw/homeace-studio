<template>
  <div class="area-parent">
    <span class="mdi mdi-folder-home-outline area-parent__icon" />
    <div class="area-parent__text">
      <b>{{ t("entitySorting.overview.areaParent") }}</b>
      <small>{{ t("entitySorting.overview.areaParentHint") }}</small>
      <div class="area-parent__controls">
        <template v-if="isTyping">
          <FolderPathField
            ref="pathField"
            v-model="typed"
            :folders="folderPaths"
            :label="t('entitySorting.overview.areaParentInput')"
            :placeholder="t('entitySorting.overview.areaParentPlaceholder')"
            @keydown.enter.prevent="takeTyped"
            @keydown.escape.stop="isTyping = false"
          />
          <button class="btn btn--sm" type="button" @click="takeTyped">
            {{ t("entitySorting.suggestions.take") }}
          </button>
          <button class="btn btn--sm" type="button" @click="isTyping = false">
            {{ t("entitySorting.rules.cancel") }}
          </button>
        </template>
        <select
          v-else
          class="field-input"
          :value="current"
          :aria-label="t('entitySorting.overview.areaParent')"
          @change="choose(($event.target as HTMLSelectElement).value)"
        >
          <option v-for="option in options" :key="option.value" :value="option.value">
            {{ option.label }}
          </option>
          <option :value="CUSTOM">{{ t("entitySorting.overview.areaParentCustom") }}</option>
        </select>
        <span class="area-parent__example">
          {{ t("entitySorting.overview.areaParentExample", { path: example }) }}
        </span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, ref, useTemplateRef } from "vue";
import { useI18n } from "vue-i18n";

import FolderPathField from "@/components/common/FolderPathField.vue";
import { useEntitySortingStore } from "@/stores/entitySortingStore";
import { cleanFolderPath } from "@/utils/categoryPath";
import { areaParents } from "@/utils/entitySorting/home";

/**
 * Where new area folders go: at the top ("Küche") or under a parent ("Haus/Küche"). Taste differs,
 * so the user decides; the tool preselects how the folders lie today. Kept for all users.
 */
const CUSTOM = "\u0000custom";

const { t } = useI18n();
const sorting = useEntitySortingStore();
const isTyping = ref(false);
const typed = ref("");
const pathField = useTemplateRef("pathField");
const folderPaths = computed(() => [...(sorting.computation?.folders ?? [])].sort());

const detected = computed(() =>
  sorting.home && sorting.computation ? areaParents(sorting.home, sorting.computation.folders) : [],
);
const current = computed(() => sorting.computation?.areaParent ?? "");
const labelOf = (parent: string): string => parent || t("entitySorting.overview.areaParentTop");

const options = computed(() => {
  const list = detected.value.map((item) => ({
    value: item.parent,
    label: t("entitySorting.overview.areaParentFound", {
      path: labelOf(item.parent),
      count: item.count,
    }),
  }));
  const values = new Set(list.map((item) => item.value));

  if (!values.has("")) list.push({ value: "", label: labelOf("") });
  if (!values.has(current.value) && current.value)
    list.push({ value: current.value, label: current.value });

  return list;
});

/** "Haus/Küche" with the first area as the example. */
const example = computed(() => {
  const area = sorting.home?.context.areas[0]?.name ?? "…";

  return current.value ? `${current.value}/${area}` : area;
});

async function choose(value: string): Promise<void> {
  if (value === CUSTOM) {
    typed.value = current.value;
    isTyping.value = true;
    await nextTick();
    pathField.value?.input?.focus();
    return;
  }

  await sorting.setAreaParent(value);
}

async function takeTyped(): Promise<void> {
  const path = cleanFolderPath(typed.value);

  isTyping.value = false;
  await sorting.setAreaParent(path);
}
</script>

<style scoped>
.area-parent {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr);
  gap: 12px;
}

.area-parent__icon {
  width: 36px;
  color: var(--accent);
  font-size: 20px;
  text-align: center;
}

.area-parent__text small {
  display: block;
  color: var(--muted);
  font-size: 12.5px;
}

.area-parent__controls {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
  margin-top: 6px;
}

.area-parent__controls .field-input {
  flex: 1 1 180px;
  max-width: 280px;
}

.area-parent__example {
  color: var(--faint);
  font-family: var(--font-mono);
  font-size: 12px;
}
</style>
