<template>
  <button
    type="button"
    class="run-history-item"
    :class="{ 'run-history-item--active': isActive }"
    @click="emit('select')"
  >
    <RunResultDot :result="run.result" />
    <span class="run-history-item__text">
      <b
        >{{ clockTime({ iso: run.startedAt, locale: settings.locale }) }} ·
        {{ t(`history.result.${run.result}`) }}</b
      >
      <small>{{ lineText({ run, flow }) }}</small>
    </span>
  </button>
</template>

<script setup lang="ts">
import { useI18n } from "vue-i18n";

import { useRunTexts } from "@/composables/texts/useRunTexts";
import type { Run } from "@/services/tracesService";
import { useSettingsStore } from "@/stores/settingsStore";
import type { DisplayFlow } from "@/types/editor";
import { clockTime } from "@/utils/runs/runTime";

import RunResultDot from "./RunResultDot.vue";

/** One run in the list of the "Verlauf" tab: its result, when it started and what it did. */
defineProps<{
  run: Run;
  /** The entry's flow, so the line can name what started the run. */
  flow: DisplayFlow | null;
  isActive: boolean;
}>();

const emit = defineEmits<{
  /** Clicked: the tab shows this run. */
  select: [];
}>();

const { t } = useI18n();
const settings = useSettingsStore();
const { lineText } = useRunTexts();
</script>

<style scoped>
.run-history-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 12px;
  border: 1px solid var(--line);
  border-radius: 10px;
  background: var(--surface);
  color: var(--fg);
  cursor: pointer;
  font: inherit;
  text-align: left;
}

.run-history-item:hover {
  border-color: var(--line-strong);
}

.run-history-item--active {
  border-color: var(--fg);
  box-shadow: inset 0 0 0 1px var(--fg);
}

.run-history-item__text {
  display: grid;
  min-width: 0;
}

.run-history-item__text b {
  font-size: 13px;
}

.run-history-item__text small {
  overflow: hidden;
  color: var(--muted);
  font-size: 12px;
  text-overflow: ellipsis;
  white-space: nowrap;
}
</style>
