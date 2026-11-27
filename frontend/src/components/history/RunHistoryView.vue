<template>
  <div class="history">
    <p v-if="traces.hasError && !history" class="history__note">{{ t("history.error") }}</p>
    <p v-else-if="!history" class="history__note">{{ t("history.loading") }}</p>

    <template v-else-if="history.runs.length === 0">
      <p class="history__empty">
        <span class="mdi mdi-history" />
        {{ t(`history.empty.${entry.kind === "script" ? "script" : "automation"}`) }}
      </p>
      <p class="history__keep">
        <span class="mdi mdi-information-outline" />
        {{ keepText }}
      </p>
    </template>

    <div v-else class="history__grid">
      <div class="history__runs">
        <template v-for="group in groups" :key="group.day">
          <div class="history__day">{{ group.day }}</div>
          <RunHistoryItem
            v-for="run in group.runs"
            :key="run.runId"
            :run="run"
            :flow="flow"
            :is-active="run.runId === selected?.runId"
            @select="select(run.runId)"
          />
        </template>
        <div class="history__keep">
          <span class="mdi mdi-information-outline" />
          <span>
            {{ keepText }}
            <button
              v-if="canKeepMore"
              class="btn history__keep-btn"
              type="button"
              :disabled="isKeeping"
              :title="t('history.keepMoreHint')"
              @click="keepMore"
            >
              {{ t("history.keepMore", { count: KEEP_MORE_RUNS }) }}
            </button>
          </span>
        </div>
      </div>

      <div v-if="selected" class="history__detail">
        <div class="history__head">
          <div class="history__result">
            <RunResultDot :result="selected.result" />
            {{ t(`history.result.${selected.result}`) }}
          </div>
          <div class="history__meta">
            <b>{{ whenText(selected) }}</b> · {{ durationText(selected) }}
          </div>
          <div class="history__meta">{{ startText({ run: selected, flow }) }}</div>
          <p v-if="RUN_RESULT_HINT[selected.result]" class="history__hint">
            {{ t(`history.hint.${selected.result}`) }}
          </p>
          <p v-if="selected.error" class="history__error">{{ errorText(selected.error) }}</p>
          <div class="history__head-buttons">
            <button
              v-if="flow"
              class="btn btn--primary"
              type="button"
              @click="emit('showOnFlow', selected.runId)"
            >
              <span class="mdi mdi-sitemap-outline" />{{ t("history.showOnFlow") }}
            </button>
          </div>
          <div v-if="isTechnicalDetailsVisible" class="history__tech mono">
            run_id {{ selected.runId }} · {{ selected.lastStep ?? "–" }}
          </div>
        </div>

        <div v-if="flow" class="history__steps">
          <template v-for="section in sections" :key="section.key">
            <div v-if="section.blocks.length" class="history__section">
              {{ t(`history.section.${section.key}`) }}
            </div>
            <RunStepRow
              v-for="block in section.blocks"
              :key="block.id"
              :block="block"
              :states="states"
              :depth="0"
              :is-technical-details-visible="isTechnicalDetailsVisible"
            />
          </template>
        </div>
        <p v-else class="history__note">{{ t("history.flowLoading") }}</p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { toRef } from "vue";
import { useI18n } from "vue-i18n";

import { useRunTexts } from "@/composables/texts/useRunTexts";
import { useRunHistory } from "@/composables/useRunHistory";
import { KEEP_MORE_RUNS, RUN_RESULT_HINT } from "@/constants/traces";
import type { DisplayFlow } from "@/types/editor";
import type { Entry } from "@/types/entry";

import RunHistoryItem from "./RunHistoryItem.vue";
import RunResultDot from "./RunResultDot.vue";
import RunStepRow from "./RunStepRow.vue";

/** The "Verlauf" tab: the runs HA kept, and what each block did in the selected one. */
const props = defineProps<{
  entry: Entry;
  flow: DisplayFlow | null;
  isTechnicalDetailsVisible: boolean;
  /** The flow lives in automations.yaml / scripts.yaml, so "keep more runs" can write it. */
  isEditable: boolean;
  /** Unsaved edits in the flow editor would clash with writing the config now. */
  hasUnsavedChanges: boolean;
}>();

const emit = defineEmits<{
  /** "Im Ablauf zeigen": the detail switches to the flow with this run on its blocks. */
  showOnFlow: [runId: string];
}>();

const { t } = useI18n();
const { errorText, startText, durationText, whenText } = useRunTexts();
const {
  traces,
  history,
  selected,
  select,
  groups,
  keepText,
  states,
  sections,
  isKeeping,
  canKeepMore,
  keepMore,
} = useRunHistory({
  entry: toRef(props, "entry"),
  flow: toRef(props, "flow"),
  isEditable: toRef(props, "isEditable"),
  hasUnsavedChanges: toRef(props, "hasUnsavedChanges"),
});
</script>

<style scoped>
.history__note,
.history__empty {
  color: var(--muted);
}

.history__empty {
  display: flex;
  gap: 8px;
  max-width: 560px;
  padding: 14px;
  border: 1px dashed var(--line-strong);
  border-radius: 12px;
}

.history__grid {
  display: grid;
  grid-template-columns: minmax(200px, 260px) minmax(0, 1fr);
  gap: 18px;
  align-items: start;
}

.history__runs {
  display: grid;
  gap: 6px;
}

.history__day {
  margin: 8px 2px 0;
  color: var(--faint);
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.07em;
  text-transform: uppercase;
}

.history__day:first-child {
  margin-top: 0;
}

.history__keep {
  display: flex;
  gap: 6px;
  margin: 6px 0 0;
  padding: 10px 12px;
  border-radius: 10px;
  background: var(--sunken);
  color: var(--muted);
  font-size: 12.5px;
  line-height: 1.4;
}

.history__keep-btn {
  display: flex;
  height: 28px;
  margin-top: 6px;
  padding: 0 10px;
  font-size: 12.5px;
}

.history__head,
.history__steps {
  padding: 14px 16px;
  border: 1px solid var(--line);
  border-radius: 12px;
  background: var(--surface);
}

.history__head {
  display: grid;
  gap: 4px;
  margin-bottom: 12px;
}

.history__result {
  display: flex;
  align-items: center;
  gap: 10px;
  font: 700 16px/1.2 var(--font-display);
}

.history__meta {
  color: var(--muted);
  font-size: 13px;
}

.history__meta b {
  color: var(--fg);
  font-weight: 600;
}

.history__hint {
  margin: 4px 0 0;
  color: var(--muted);
  font-size: 13px;
}

.history__error {
  margin: 4px 0 0;
  color: var(--err);
  font-size: 13px;
}

.history__head-buttons {
  margin-top: 6px;
}

.history__head-buttons .btn {
  gap: 6px;
}

.history__tech {
  color: var(--faint);
  font-size: 11.5px;
}

.history__steps {
  padding-top: 6px;
}

.history__section {
  padding: 12px 0 2px;
  color: var(--faint);
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.07em;
  text-transform: uppercase;
}

@media (max-width: 760px) {
  .history__grid {
    grid-template-columns: minmax(0, 1fr);
  }
}
</style>
