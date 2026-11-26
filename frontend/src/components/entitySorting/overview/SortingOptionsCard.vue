<template>
  <section class="overview__card">
    <h3>{{ t("entitySorting.overview.optionsTitle") }}</h3>
    <div class="overview__option">
      <SwitchToggle
        :model-value="sorting.options.isTechnicalSeparate"
        :label="t('entitySorting.overview.technical')"
        @update:model-value="(value) => sorting.setOptions({ isTechnicalSeparate: value })"
      />
      <div>
        <b>{{ t("entitySorting.overview.technical") }}</b>
        <small>{{ t("entitySorting.overview.technicalHint") }}</small>
        <label v-if="sorting.options.isTechnicalSeparate" class="overview__folder">
          {{ t("entitySorting.overview.technicalInto") }}
          <input
            class="field-input"
            :value="sorting.options.technicalFolder"
            :aria-label="t('entitySorting.overview.technicalFolder')"
            @change="
              (event) =>
                sorting.setOptions({ technicalFolder: (event.target as HTMLInputElement).value })
            "
          />
        </label>
      </div>
    </div>
    <div class="overview__option">
      <SwitchToggle
        :model-value="sorting.options.includeHidden"
        :label="t('entitySorting.overview.includeHidden')"
        @update:model-value="(value) => sorting.setOptions({ includeHidden: value })"
      />
      <div>
        <b>{{ t("entitySorting.overview.includeHidden") }}</b>
        <small>{{
          t("entitySorting.overview.includeHiddenHint", { count: stats.hidden }, stats.hidden)
        }}</small>
      </div>
    </div>

    <SortingAreaParentOption />

    <h3>{{ t("entitySorting.overview.keptTitle") }}</h3>
    <div class="overview__kept">
      <span>{{ t("entitySorting.overview.rejected", { count: rejectedCount }) }}</span>
      <button
        v-if="rejectedCount"
        class="btn btn--sm"
        type="button"
        @click="sorting.resetRejected()"
      >
        {{ t("entitySorting.overview.reset") }}
      </button>
    </div>
    <div class="overview__kept">
      <span>{{ t("entitySorting.overview.ignoredCount", { count: stats.ignored }) }}</span>
      <button
        v-if="stats.ignored"
        class="btn btn--sm"
        type="button"
        @click="sorting.resetIgnored()"
      >
        {{ t("entitySorting.overview.reset") }}
      </button>
    </div>
    <div class="overview__kept">
      <span v-if="sorting.lastRun">
        {{
          t("entitySorting.overview.lastRun", {
            when: formatWhen(sorting.lastRun.at),
            entities: t(
              "entitySorting.entities",
              { count: sorting.lastRun.moves.length },
              sorting.lastRun.moves.length,
            ),
          })
        }}
      </span>
      <span v-else>{{ t("entitySorting.overview.lastRunNone") }}</span>
      <button v-if="sorting.lastRun" class="btn btn--sm" type="button" @click="emit('undo')">
        <span class="mdi mdi-undo" />{{ t("entitySorting.overview.undo") }}
      </button>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { useI18n } from "vue-i18n";

import SwitchToggle from "@/components/common/SwitchToggle.vue";
import { useEntitySortingStore } from "@/stores/entitySortingStore";
import type { SortingOverview } from "@/utils/entitySorting/overview";

import SortingAreaParentOption from "./SortingAreaParentOption.vue";

/** Step 1, the second card: the options of this run and what the tool keeps between runs. */
defineProps<{
  stats: SortingOverview;
}>();

const emit = defineEmits<{
  undo: [];
}>();

const { t, locale } = useI18n();
const sorting = useEntitySortingStore();

/** "26.11.26, 14:20" in the UI language. */
function formatWhen(at: string): string {
  return new Date(at).toLocaleString(locale.value, { dateStyle: "short", timeStyle: "short" });
}

const rejectedCount = computed(() =>
  [...sorting.rejected.values()].reduce((sum, paths) => sum + paths.size, 0),
);
</script>

<style scoped>
/* The same as in SortingOverviewStep: scoped styles do not reach into a child component. */
.overview__card h3 {
  margin: 0;
  font: 700 15.5px/1.3 var(--font-display);
}

.overview__option {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr);
  align-items: start;
  gap: 12px;
}

.overview__option small {
  display: block;
  color: var(--muted);
  font-size: 12.5px;
}

.overview__folder {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 6px;
  color: var(--muted);
}

.overview__kept {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  font-size: 13.5px;
}

.overview__kept + .overview__kept {
  padding-top: 10px;
  border-top: 1px solid var(--line);
}
</style>
