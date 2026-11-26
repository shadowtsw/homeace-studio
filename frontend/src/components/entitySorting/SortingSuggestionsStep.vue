<template>
  <div class="suggestions__tools">
    <button
      v-for="filter in FILTERS"
      :key="filter.key"
      class="suggestions__filter"
      type="button"
      :aria-pressed="sorting.filters[filter.key]"
      @click="sorting.filters[filter.key] = !sorting.filters[filter.key]"
    >
      {{ t(filter.label) }}
    </button>
    <input
      v-model="sorting.query"
      class="field-input suggestions__search"
      type="search"
      :placeholder="t('entitySorting.suggestions.search')"
      :aria-label="t('entitySorting.suggestions.search')"
    />
  </div>

  <div v-if="sorting.changes.size" class="suggestions__live" role="status">
    <span class="mdi mdi-auto-fix" />
    <span>{{ t("entitySorting.suggestions.live", { changes: changeSummary }) }}</span>
    <button class="btn btn--sm" type="button" @click="sorting.reorder()">
      <span class="mdi mdi-sort" />{{ t("entitySorting.suggestions.reorder") }}
    </button>
  </div>

  <p v-if="!sorting.computation?.bundles.size" class="suggestions__empty">
    {{ t("entitySorting.suggestions.allSorted") }}
  </p>

  <div v-else-if="!sections.length" class="suggestions__nothing">
    <p>{{ t("entitySorting.suggestions.nothingForFilter") }}</p>
    <div class="suggestions__nothing-actions">
      <button
        v-if="!sorting.filters.likely"
        class="btn btn--sm"
        type="button"
        @click="sorting.filters.likely = true"
      >
        {{ t("entitySorting.suggestions.showLikely") }}
      </button>
      <button class="btn btn--sm" type="button" @click="showAll">
        {{ t("entitySorting.suggestions.showAll") }}
      </button>
    </div>
  </div>

  <div v-else class="kb-list">
    <section v-for="section in sections" :key="section.key" class="suggestions__section">
      <div class="suggestions__section-head">
        <h3>{{ t(section.title) }}</h3>
        <span>{{ t(section.note) }}</span>
      </div>
      <SortingGroupCard
        v-for="group in section.groups"
        :key="group.key"
        :group="group"
        :is-open="openGroups.has(group.key)"
        :folder-options="folderOptions"
        @toggle="toggleGroup(group.key)"
      />
    </section>
  </div>

  <div
    v-if="sheetGroup"
    class="suggestions__sheet-scrim"
    @click.self="sorting.sheetGroupKey = null"
  >
    <div class="suggestions__sheet" role="dialog" aria-modal="true" :aria-label="sheetTitle">
      <div class="suggestions__sheet-head">
        <h3>{{ sheetTitle }}</h3>
        <button
          class="icon-btn"
          type="button"
          :aria-label="t('entitySorting.close')"
          @click="sorting.sheetGroupKey = null"
        >
          <span class="mdi mdi-close" />
        </button>
      </div>
      <div class="suggestions__sheet-body kb-list">
        <SortingGroupCard
          :group="sheetGroup"
          :is-open="true"
          :folder-options="folderOptions"
          is-in-sheet
        />
      </div>
      <div class="suggestions__sheet-foot">
        <button class="btn btn--primary" type="button" @click="sorting.sheetGroupKey = null">
          {{ t("entitySorting.done") }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onKeyStroke, useMediaQuery } from "@vueuse/core";
import { computed, ref, watch } from "vue";
import { useI18n } from "vue-i18n";

import { useSortingTexts } from "@/composables/texts/useSortingTexts";
import { useEntitySortingStore } from "@/stores/entitySortingStore";
import type { Confidence } from "@/utils/entitySorting/model";
import {
  allGroups,
  folderChoices,
  groupTarget,
  suggestionSections,
} from "@/utils/entitySorting/targets";

import SortingGroupCard from "./SortingGroupCard.vue";

/** Step 3: proposals grouped by target folder, in four sections; rows stay put while ticking. */
const FILTERS: { key: Confidence; label: string }[] = [
  { key: "rule", label: "entitySorting.suggestions.filterRule" },
  { key: "sure", label: "entitySorting.suggestions.filterSure" },
  { key: "likely", label: "entitySorting.suggestions.filterLikely" },
  { key: "unclear", label: "entitySorting.suggestions.filterUnclear" },
];

const { t } = useI18n();
const sorting = useEntitySortingStore();
const texts = useSortingTexts();
const isPhone = useMediaQuery("(max-width: 640px)");
const openGroups = ref(new Set<string>());

const sections = computed(() =>
  sorting.layout
    ? suggestionSections({ layout: sorting.layout, isVisible: sorting.isVisible })
    : [],
);
const everyGroup = computed(() => (sorting.layout ? allGroups(sorting.layout) : []));

function showAll(): void {
  sorting.filters = { rule: true, sure: true, likely: true, unclear: true };
  sorting.query = "";
}

/** Existing folders and the new ones of this session, for "Anderer Ordner …". */
const folderOptions = computed(() =>
  folderChoices({
    folders: sorting.computation?.folders ?? [],
    freshGroups: sorting.layout?.fresh ?? [],
    groupNames: sorting.groupNames,
  }),
);

const changeSummary = computed(() => texts.liveChanges(sorting.changes));

// The group in the sheet on phones
const sheetGroup = computed(() =>
  isPhone.value && sorting.sheetGroupKey
    ? (everyGroup.value.find((group) => group.key === sorting.sheetGroupKey) ?? null)
    : null,
);
const sheetTitle = computed(() => {
  const group = sheetGroup.value;
  if (!group) return "";
  if (group.type === "system") return t("entitySorting.suggestions.sectionSystem");
  if (group.type === "rest") return t("entitySorting.suggestions.sectionRest");

  return groupTarget({ group, groupNames: sorting.groupNames }) ?? "";
});

// The first and biggest group starts open, so the list shows what the tool does.
watch(
  () => sorting.layout,
  (layout) => {
    const first = layout?.folder[0] ?? layout?.fresh[0];
    if (first && openGroups.value.size === 0) openGroups.value = new Set([first.key]);
  },
  { immediate: true },
);

function toggleGroup(key: string): void {
  const next = new Set(openGroups.value);
  if (!next.delete(key)) next.add(key);
  openGroups.value = next;
}

onKeyStroke("Escape", () => {
  sorting.sheetGroupKey = null;
});
</script>

<style scoped>
.suggestions__tools {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
  margin-bottom: 12px;
}

.suggestions__filter {
  display: inline-flex;
  align-items: center;
  height: 30px;
  padding: 0 11px;
  border: 1px solid var(--line-strong);
  border-radius: 999px;
  background: var(--surface);
  color: var(--muted);
  cursor: pointer;
  font-size: 12.5px;
  font-weight: 600;
}

.suggestions__filter[aria-pressed="true"] {
  border-color: var(--fg);
  background: var(--fg);
  color: var(--surface);
}

.suggestions__search {
  flex: 1 1 200px;
  max-width: 320px;
}

.suggestions__live {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 10px;
  margin-bottom: 12px;
  padding: 9px 12px;
  border-radius: 10px;
  background: var(--accent-soft);
  font-size: 13.5px;
}

.suggestions__live > .mdi {
  color: var(--accent);
}

.suggestions__nothing {
  display: grid;
  justify-items: start;
  gap: 10px;
  padding: 16px;
  border: 1px dashed var(--line-strong);
  border-radius: 12px;
  color: var(--muted);
}

.suggestions__nothing p {
  margin: 0;
}

.suggestions__nothing-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.suggestions__empty {
  color: var(--muted);
}

.suggestions__section {
  display: grid;
  gap: 8px;
  margin-bottom: 22px;
}

.suggestions__section-head {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: 10px;
}

.suggestions__section-head h3 {
  margin: 0;
  font: 700 15px/1.3 var(--font-display);
}

.suggestions__section-head span {
  color: var(--muted);
  font-size: 12.5px;
}

.suggestions__sheet-scrim {
  position: fixed;
  inset: 0;
  z-index: 108;
  background: var(--scrim);
}

.suggestions__sheet {
  position: absolute;
  right: 0;
  bottom: 0;
  left: 0;
  display: grid;
  grid-template-rows: auto minmax(0, 1fr) auto;
  max-height: 86%;
  padding: 0 env(safe-area-inset-right, 0px) env(safe-area-inset-bottom, 0px)
    env(safe-area-inset-left, 0px);
  border-radius: 16px 16px 0 0;
  background: var(--surface);
  box-shadow: var(--shadow);
}

.suggestions__sheet-head {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 10px 10px 16px;
  border-bottom: 1px solid var(--line);
}

.suggestions__sheet-head h3 {
  margin: 0 auto 0 0;
  font: 700 16px/1.3 var(--font-display);
}

.suggestions__sheet-body {
  overflow: auto;
}

.suggestions__sheet-foot {
  display: flex;
  justify-content: flex-end;
  padding: 10px 14px;
  border-top: 1px solid var(--line);
}
</style>
