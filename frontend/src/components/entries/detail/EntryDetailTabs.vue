<template>
  <div class="entry-detail-tabs" role="tablist">
    <button
      v-for="tab in tabs"
      :key="tab"
      type="button"
      role="tab"
      class="entry-detail-tabs__tab"
      :class="{ 'entry-detail-tabs__tab--active': activeTab === tab }"
      :aria-selected="activeTab === tab"
      @click="emit('select', tab)"
    >
      {{ t(`detail.tabs.${tab}`) }}
      <span
        v-if="tab === DETAIL_TAB.dependencies && dependencyCount"
        class="entry-detail-tabs__badge"
      >
        {{ dependencyCount }}
      </span>
    </button>
  </div>
</template>

<script setup lang="ts">
import { useI18n } from "vue-i18n";

import { DETAIL_TAB, type DetailTab } from "@/constants/entries";

/** The tab bar of the detail column; the dependencies tab counts uses and users. */
defineProps<{
  tabs: DetailTab[];
  activeTab: DetailTab;
  /** Uses and users together; no badge at 0. */
  dependencyCount: number;
}>();

const emit = defineEmits<{
  select: [tab: DetailTab];
}>();

const { t } = useI18n();
</script>

<style scoped>
.entry-detail-tabs {
  display: flex;
  gap: 2px;
  overflow-x: auto;
  padding: 0 28px;
  scrollbar-width: none;
  border-bottom: 1px solid var(--line);
  background: var(--surface);
}

.entry-detail-tabs__tab {
  flex: none;
  padding: 10px 12px 11px;
  white-space: nowrap;
  border: 0;
  border-bottom: 2px solid transparent;
  background: none;
  color: var(--muted);
  cursor: pointer;
  font-weight: 600;
}

.entry-detail-tabs__tab:hover {
  color: var(--fg);
}

.entry-detail-tabs__badge {
  margin-left: 6px;
  padding: 1px 6px;
  border-radius: 999px;
  background: var(--sunken);
  color: var(--muted);
  font-size: 11.5px;
  font-variant-numeric: tabular-nums;
}

.entry-detail-tabs__tab--active {
  border-bottom-color: var(--fg);
  color: var(--fg);
}
</style>
