<template>
  <p class="overview__lead">{{ t("entitySorting.overview.lead") }}</p>
  <p class="overview__beta">
    <span class="mdi mdi-information-outline" />
    <span>
      {{ t("entitySorting.overview.betaNote") }}
      <a :href="ISSUES_URL" target="_blank" rel="noopener">{{ t("entitySorting.report") }}</a>
    </span>
  </p>

  <div v-if="stats" class="overview__cards">
    <section class="overview__card">
      <h3>
        {{ t("entitySorting.overview.funnelTitle", { from: stats.unsorted, to: stats.bundles }) }}
      </h3>
      <div class="overview__funnel">
        <SortingFunnelRow
          :label="t('entitySorting.overview.unsorted')"
          :count="stats.unsorted"
          :max="stats.unsorted"
          kind="total"
        />
        <SortingFunnelRow
          :label="t('entitySorting.overview.yaml')"
          :count="stats.stateOnly.length"
          :max="stats.unsorted"
          kind="minus"
        >
          <button class="overview__link" type="button" @click="isYamlWhyOpen = !isYamlWhyOpen">
            {{ t("entitySorting.overview.why") }}
          </button>
        </SortingFunnelRow>
        <p v-if="isYamlWhyOpen" class="overview__why">
          {{ t("entitySorting.overview.yamlWhy") }} {{ stats.stateOnly.join(", ") }}
        </p>
        <SortingFunnelRow
          :label="
            sorting.options.includeHidden
              ? t('entitySorting.overview.hiddenIncluded')
              : t('entitySorting.overview.hidden')
          "
          :count="sorting.options.includeHidden ? 0 : stats.hidden"
          :max="stats.unsorted"
          kind="minus"
        />
        <SortingFunnelRow
          :label="t('entitySorting.overview.ignored')"
          :count="stats.ignored"
          :max="stats.unsorted"
          kind="minus"
        >
          <button
            v-if="stats.ignored"
            class="overview__link"
            type="button"
            @click="sorting.resetIgnored()"
          >
            {{ t("entitySorting.overview.takeBack") }}
          </button>
        </SortingFunnelRow>
        <SortingFunnelRow
          :label="t('entitySorting.overview.remaining')"
          :count="stats.offered"
          :max="stats.unsorted"
          kind="keep"
        />
      </div>

      <div class="overview__decisions">
        <span class="overview__big">{{ stats.bundles }}</span>
        <span>{{ t("entitySorting.overview.decisions", { count: stats.offered }) }}</span>
        <small>
          {{ t("entitySorting.overview.devices", { count: stats.devices }, stats.devices) }} ·
          {{ t("entitySorting.overview.system", { count: stats.system }, stats.system) }} ·
          {{ t("entitySorting.overview.single", { count: stats.single }, stats.single) }}
        </small>
      </div>

      <h3>{{ t("entitySorting.overview.nowTitle") }}</h3>
      <div class="overview__stack" role="img" :aria-label="t('entitySorting.overview.nowTitle')">
        <span
          v-for="level in LEVELS"
          :key="level.key"
          :class="`overview__level--${level.key}`"
          :style="{ width: `${(100 * stats.levels[level.key]) / Math.max(1, stats.bundles)}%` }"
        />
      </div>
      <div class="overview__legend">
        <span v-for="level in LEVELS" :key="level.key">
          <i :class="`overview__level--${level.key}`" />{{ t(level.label) }}
          {{ stats.levels[level.key] }}
        </span>
      </div>
    </section>

    <SortingOptionsCard :stats="stats" @undo="emit('undo')" />
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from "vue";
import { useI18n } from "vue-i18n";

import { ISSUES_URL } from "@/constants/settings";
import { useEntitySortingStore } from "@/stores/entitySortingStore";
import { sortingOverview } from "@/utils/entitySorting/overview";

import SortingFunnelRow from "./SortingFunnelRow.vue";
import SortingOptionsCard from "./SortingOptionsCard.vue";

/** Step 1: how the pile shrinks, the options of this run and what the tool keeps. */
const emit = defineEmits<{
  undo: [];
}>();

const LEVELS = [
  { key: "rule", label: "entitySorting.overview.levelRule" },
  { key: "sure", label: "entitySorting.overview.levelSure" },
  { key: "likely", label: "entitySorting.overview.levelLikely" },
  { key: "fresh", label: "entitySorting.overview.levelFresh" },
  { key: "rest", label: "entitySorting.overview.levelRest" },
] as const;

const { t } = useI18n();
const sorting = useEntitySortingStore();
const isYamlWhyOpen = ref(false);

const stats = computed(() =>
  sorting.home && sorting.computation && sorting.layout
    ? sortingOverview({
        home: sorting.home,
        state: sorting.state(),
        computation: sorting.computation,
        layout: sorting.layout,
      })
    : null,
);
</script>

<style scoped>
.overview__lead {
  max-width: 72ch;
  margin: 0 0 12px;
  color: var(--muted);
}

.overview__beta {
  display: flex;
  gap: 10px;
  max-width: 86ch;
  margin: 0 0 16px;
  padding: 10px 12px;
  border: 1px dashed var(--accent);
  border-radius: 10px;
  color: var(--muted);
  font-size: 13px;
}

.overview__beta .mdi {
  color: var(--accent);
}

.overview__beta a,
.overview__link {
  color: var(--accent);
  font-weight: 600;
}

.overview__link {
  padding: 0;
  border: 0;
  background: none;
  cursor: pointer;
}

.overview__cards {
  display: grid;
  grid-template-columns: minmax(0, 1.35fr) minmax(0, 1fr);
  align-items: start;
  gap: 14px;
}

.overview__card {
  display: grid;
  gap: 12px;
  min-width: 0;
  padding: 16px;
  border: 1px solid var(--line);
  border-radius: 12px;
}

.overview__card h3 {
  margin: 0;
  font: 700 15.5px/1.3 var(--font-display);
}

.overview__funnel {
  display: grid;
  gap: 7px;
}

.overview__why {
  margin: 0;
  padding: 8px 10px;
  border-radius: 8px;
  background: var(--surface-2);
  color: var(--muted);
  font-size: 12.5px;
}

.overview__decisions {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: 10px;
  padding: 14px 16px;
  border-radius: 12px;
  background: var(--accent-soft);
  font-weight: 600;
}

.overview__big {
  color: var(--accent);
  font: 700 34px/1 var(--font-display);
  font-variant-numeric: tabular-nums;
}

.overview__decisions small {
  width: 100%;
  color: var(--muted);
  font-size: 12.5px;
  font-weight: 400;
}

.overview__stack {
  display: flex;
  height: 14px;
  overflow: hidden;
  border-radius: 7px;
  background: var(--sunken);
}

.overview__legend {
  display: flex;
  flex-wrap: wrap;
  gap: 6px 14px;
  color: var(--muted);
  font-size: 12.5px;
}

.overview__legend i {
  display: inline-block;
  width: 10px;
  height: 10px;
  margin-right: 6px;
  border-radius: 3px;
  vertical-align: -1px;
}

.overview__level--rule {
  background: var(--accent);
}

.overview__level--sure {
  background: var(--ok);
}

.overview__level--likely {
  background: var(--warn);
}

.overview__level--fresh {
  background: var(--kind-script);
}

.overview__level--rest {
  background: var(--line-strong);
}

@media (max-width: 860px) {
  .overview__cards {
    grid-template-columns: 1fr;
  }
}
</style>
