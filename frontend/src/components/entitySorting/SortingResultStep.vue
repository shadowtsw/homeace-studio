<template>
  <div class="result-step">
    <div class="result-step__head">
      <span class="result-step__mark"><span class="mdi mdi-check" /></span>
      <div>
        <h2>{{ t("entitySorting.result.title", { count: result.moved }, result.moved) }}</h2>
        <span class="result-step__detail">{{ detail }}</span>
      </div>
    </div>

    <div v-if="result.failed.length" class="result-step__failed">
      <b>{{
        t("entitySorting.result.failedTitle", { count: result.failed.length }, result.failed.length)
      }}</b>
      <span v-for="item in result.failed" :key="item.entityId">
        {{ nameOf(item.entityId) }}:
        {{
          item.status === "notInRegistry"
            ? t("entitySorting.result.notInRegistry")
            : t("entitySorting.result.failed")
        }}
      </span>
    </div>

    <section v-if="result.hints.length" class="result-step__card">
      <h3>{{ t("entitySorting.result.hintsTitle") }}</h3>
      <ul>
        <li v-for="hint in result.hints" :key="hint.flowName">
          {{ t("entitySorting.result.hint", { flow: hint.flowName, folder: hint.folder }) }}
        </li>
      </ul>
      <small>{{ t("entitySorting.result.hintsLater") }}</small>
    </section>

    <section class="result-step__card">
      <span>{{ t("entitySorting.result.remaining", { count: remaining }) }}</span>
      <div class="result-step__undo">
        <span>{{ t("entitySorting.result.undoNote") }}</span>
        <button
          class="btn btn--sm"
          type="button"
          :disabled="isUndoing || !sorting.lastRun"
          @click="emit('undo')"
        >
          <span class="mdi mdi-undo" />{{ t("entitySorting.overview.undo") }}
        </button>
      </div>
    </section>

    <p class="result-step__beta">
      {{ t("entitySorting.result.betaLine") }}
      <a :href="ISSUES_URL" target="_blank" rel="noopener">{{ t("entitySorting.report") }}</a>
    </p>
  </div>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { useI18n } from "vue-i18n";

import { ISSUES_URL } from "@/constants/settings";
import type { SortingResult } from "@/composables/useSortingRun";
import { useEntitySortingStore } from "@/stores/entitySortingStore";

/** Step 5: what happened, what failed, automations that could follow, and undo. */
const props = defineProps<{
  result: SortingResult;
  isUndoing: boolean;
}>();

const emit = defineEmits<{
  undo: [];
}>();

const { t } = useI18n();
const sorting = useEntitySortingStore();

const detail = computed(
  () =>
    t("entitySorting.result.folders", { count: props.result.folders }, props.result.folders) +
    (props.result.newFolders
      ? t("entitySorting.result.fresh", { count: props.result.newFolders }, props.result.newFolders)
      : "") +
    t("entitySorting.result.counted"),
);
const remaining = computed(
  () => sorting.home?.context.entities.filter((entity) => !entity.categoryPath).length ?? 0,
);

function nameOf(entityId: string): string {
  return sorting.home?.entities.get(entityId)?.name ?? entityId;
}
</script>

<style scoped>
.result-step {
  display: grid;
  gap: 14px;
  max-width: 760px;
}

.result-step__head {
  display: flex;
  align-items: center;
  gap: 14px;
}

.result-step__head h2 {
  margin: 0;
  font: 700 22px/1.2 var(--font-display);
}

.result-step__mark {
  display: grid;
  flex: none;
  place-items: center;
  width: 44px;
  height: 44px;
  border-radius: 50%;
  background: var(--ok-soft);
  color: var(--ok);
  font-size: 24px;
}

.result-step__detail,
.result-step__card small {
  color: var(--muted);
}

.result-step__failed {
  display: grid;
  gap: 4px;
  padding: 10px 12px;
  border: 1px solid var(--err-soft);
  border-radius: 10px;
  background: color-mix(in srgb, var(--err-soft) 45%, transparent);
  font-size: 13.5px;
}

.result-step__failed b {
  color: var(--err);
}

.result-step__card {
  display: grid;
  gap: 10px;
  padding: 16px;
  border: 1px solid var(--line);
  border-radius: 12px;
  font-size: 13.5px;
}

.result-step__card h3 {
  margin: 0;
  font: 700 15.5px/1.3 var(--font-display);
}

.result-step__card ul {
  display: grid;
  gap: 4px;
  margin: 0;
  padding-left: 18px;
}

.result-step__undo {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  padding-top: 10px;
  border-top: 1px solid var(--line);
}

.result-step__beta {
  margin: 0;
  color: var(--muted);
  font-size: 13px;
}

.result-step__beta a {
  color: var(--accent);
  font-weight: 600;
}
</style>
