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
          <button
            v-for="run in group.runs"
            :key="run.runId"
            type="button"
            class="history__run"
            :class="{ 'history__run--active': run.runId === selected?.runId }"
            @click="selectedRunId = run.runId"
          >
            <span class="history__dot" :class="`history__dot--${RESULT_TONE[run.result]}`">
              <span class="mdi" :class="RESULT_ICON[run.result]" />
            </span>
            <span class="history__run-text">
              <b
                >{{ clockTime({ iso: run.startedAt, locale: settings.locale }) }} ·
                {{ t(`history.result.${run.result}`) }}</b
              >
              <small>{{ runLine(run) }}</small>
            </span>
          </button>
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
              {{ t("history.keepMore", { count: MORE_RUNS }) }}
            </button>
          </span>
        </div>
      </div>

      <div v-if="selected" class="history__detail">
        <div class="history__head">
          <div class="history__result">
            <span class="history__dot" :class="`history__dot--${RESULT_TONE[selected.result]}`">
              <span class="mdi" :class="RESULT_ICON[selected.result]" />
            </span>
            {{ t(`history.result.${selected.result}`) }}
          </div>
          <div class="history__meta">
            <b>{{ whenText(selected) }}</b> · {{ durationText(selected) }}
          </div>
          <div class="history__meta">{{ startText(selected) }}</div>
          <p v-if="RESULT_HINT[selected.result]" class="history__hint">
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
import { computed, ref, watch } from "vue";
import { useI18n } from "vue-i18n";

import { useRunTexts } from "@/composables/texts/useRunTexts";
import { useStateText } from "@/composables/texts/useStateText";
import type { Run, RunResult } from "@/services/tracesService";
import { useLookupsStore } from "@/stores/lookupsStore";
import { useMessagesStore } from "@/stores/messagesStore";
import { useSettingsStore } from "@/stores/settingsStore";
import { useToastStore } from "@/stores/toastStore";
import { useTracesStore } from "@/stores/tracesStore";
import type { DisplayFlow } from "@/types/editor";
import type { Entry } from "@/types/entry";
import { runSeconds, runStatesFor } from "@/utils/runs/runStates";
import { clockTime, dayLabel, runDuration } from "@/utils/runs/runTime";

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

const RESULT_ICON: Record<RunResult, string> = {
  finished: "mdi-check",
  conditionsFailed: "mdi-cancel",
  error: "mdi-alert-circle-outline",
  running: "mdi-timer-sand",
  cancelled: "mdi-restart",
  ignored: "mdi-minus-circle-outline",
  stopped: "mdi-stop-circle-outline",
  unknown: "mdi-help-circle-outline",
};

const RESULT_TONE: Record<RunResult, string> = {
  finished: "ok",
  conditionsFailed: "warn",
  error: "err",
  running: "run",
  cancelled: "none",
  ignored: "none",
  stopped: "none",
  unknown: "none",
};

/** Results that need a sentence of explanation. */
const RESULT_HINT: Partial<Record<RunResult, true>> = { cancelled: true, ignored: true };

const { t } = useI18n();
const traces = useTracesStore();
const lookups = useLookupsStore();
const settings = useSettingsStore();
const stateText = useStateText();
const { errorText } = useRunTexts();
const toasts = useToastStore();
const messages = useMessagesStore();

/** "Die letzten 20 merken". */
const MORE_RUNS = 20;
const isKeeping = ref(false);
const canKeepMore = computed(
  () =>
    props.isEditable &&
    !props.hasUnsavedChanges &&
    (history.value?.storedTraces ?? MORE_RUNS) < MORE_RUNS,
);

async function keepMore(): Promise<void> {
  isKeeping.value = true;

  try {
    await traces.keepMore({ entityId: props.entry.entityId, count: MORE_RUNS });
    toasts.show({ text: t("history.kept", { count: MORE_RUNS }) });
  } catch (error) {
    toasts.show({
      text: messages.textFor({ error, fallback: t("errors.actionFailed") }),
      tone: "error",
    });
  } finally {
    isKeeping.value = false;
  }
}

void lookups.loadEntities();

const selectedRunId = ref<string | null>(null);

watch(
  () => props.entry.entityId,
  (entityId) => {
    selectedRunId.value = null;
    void traces.load(entityId);
  },
  { immediate: true },
);

const history = computed(() =>
  traces.current?.entityId === props.entry.entityId ? traces.current : null,
);
const selected = computed(
  () =>
    history.value?.runs.find((run) => run.runId === selectedRunId.value) ??
    history.value?.runs[0] ??
    null,
);

const groups = computed(() => {
  const now = new Date();
  const result: { day: string; runs: Run[] }[] = [];
  const texts = { today: t("history.today"), yesterday: t("history.yesterday") };

  for (const run of history.value?.runs ?? []) {
    const day = dayLabel({ iso: run.startedAt, now, locale: settings.locale, texts });
    const last = result[result.length - 1];
    if (last?.day === day) last.runs.push(run);
    else result.push({ day, runs: [run] });
  }

  return result;
});

const keepText = computed(() =>
  t(`history.keep.${props.entry.kind === "script" ? "script" : "automation"}`, {
    count: history.value?.storedTraces ?? 5,
  }),
);

const states = computed(() =>
  selected.value && props.flow
    ? runStatesFor({ run: selected.value, flow: props.flow })
    : new Map(),
);

const sections = computed(() => {
  const flow = props.flow;
  if (!flow) return [];
  if (props.entry.kind === "script") return [{ key: "sequence", blocks: flow.actions }];

  return [
    { key: "triggers", blocks: flow.triggers },
    { key: "conditions", blocks: flow.conditions },
    { key: "actions", blocks: flow.actions },
  ];
});

function nameOf(entityId: string): string {
  return lookups.entityNames[entityId] ?? entityId;
}

/** "Bewegungsmelder Terrasse: „Erkannt“", "Von Hand gestartet", or the trigger block. */
function startText(run: Run): string {
  const start = run.start;

  if (start.by === "user") return t("history.start.user");
  if (start.by === "flow") return t("history.start.flow");
  if (start.entityId && start.to !== null) {
    return t("history.start.entity", {
      name: nameOf(start.entityId),
      state: stateText({ state: start.to, unit: null }),
    });
  }

  const trigger =
    start.triggerIndex !== null ? props.flow?.triggers[start.triggerIndex] : undefined;
  if (trigger) {
    return t("history.start.trigger", {
      text: [trigger.title, ...trigger.chips.map((chip) => chip.text)].join(" "),
    });
  }

  return t("history.start.unknown");
}

function durationText(run: Run): string {
  const seconds = runSeconds(run);
  return seconds === null
    ? t("history.runningSince")
    : t("history.took", { duration: runDuration({ seconds, locale: settings.locale }) });
}

function runLine(run: Run): string {
  const seconds = runSeconds(run);
  const duration =
    seconds === null
      ? t("history.runningShort")
      : runDuration({ seconds, locale: settings.locale });
  return `${duration} · ${startText(run)}`;
}

function whenText(run: Run): string {
  const day = dayLabel({
    iso: run.startedAt,
    now: new Date(),
    locale: settings.locale,
    texts: {
      today: t("history.today"),
      yesterday: t("history.yesterday"),
    },
  });
  return `${day}, ${clockTime({ iso: run.startedAt, locale: settings.locale })}`;
}
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

.history__run {
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

.history__run:hover {
  border-color: var(--line-strong);
}

.history__run--active {
  border-color: var(--fg);
  box-shadow: inset 0 0 0 1px var(--fg);
}

.history__run-text {
  display: grid;
  min-width: 0;
}

.history__run-text b {
  font-size: 13px;
}

.history__run-text small {
  overflow: hidden;
  color: var(--muted);
  font-size: 12px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.history__dot {
  display: grid;
  flex: none;
  place-items: center;
  width: 24px;
  height: 24px;
  border-radius: 50%;
  font-size: 14px;
}

.history__dot--ok {
  background: var(--ok-soft);
  color: var(--ok);
}

.history__dot--warn {
  background: var(--warn-soft);
  color: var(--warn);
}

.history__dot--err {
  background: var(--err-soft);
  color: var(--err);
}

.history__dot--run {
  background: var(--accent-soft);
  color: var(--accent);
}

.history__dot--none {
  background: var(--sunken);
  color: var(--muted);
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
