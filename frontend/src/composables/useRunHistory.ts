import { computed, ref, watch, type Ref } from "vue";
import { useI18n } from "vue-i18n";

import { useRunTexts } from "@/composables/texts/useRunTexts";
import { DEFAULT_STORED_TRACES, KEEP_MORE_RUNS } from "@/constants/traces";
import type { Run } from "@/services/tracesService";
import { useLookupsStore } from "@/stores/lookupsStore";
import { useMessagesStore } from "@/stores/messagesStore";
import { useToastStore } from "@/stores/toastStore";
import { useTracesStore } from "@/stores/tracesStore";
import type { DisplayFlow } from "@/types/editor";
import type { Entry } from "@/types/entry";
import { runStatesFor } from "@/utils/runs/runStates";

type UseRunHistoryOptions = {
  entry: Ref<Entry>;
  flow: Ref<DisplayFlow | null>;
  /** The flow lives in automations.yaml / scripts.yaml, so "keep more runs" can write it. */
  isEditable: Ref<boolean>;
  /** Unsaved edits in the flow editor would clash with writing the config now. */
  hasUnsavedChanges: Ref<boolean>;
};

/**
 * The runs HA kept of the open automation or script, grouped by day; the selected one (the
 * newest until one is picked) and what each block did in it; "keep more runs".
 */
export function useRunHistory({
  entry,
  flow,
  isEditable,
  hasUnsavedChanges,
}: UseRunHistoryOptions) {
  const { t } = useI18n();
  const traces = useTracesStore();
  const lookups = useLookupsStore();
  const toasts = useToastStore();
  const messages = useMessagesStore();
  const { dayText } = useRunTexts();

  // "Die letzten 20 merken"
  const isKeeping = ref(false);
  const canKeepMore = computed(
    () =>
      isEditable.value &&
      !hasUnsavedChanges.value &&
      (history.value?.storedTraces ?? KEEP_MORE_RUNS) < KEEP_MORE_RUNS,
  );

  async function keepMore(): Promise<void> {
    isKeeping.value = true;

    try {
      await traces.keepMore({ entityId: entry.value.entityId, count: KEEP_MORE_RUNS });
      toasts.show({ text: t("history.kept", { count: KEEP_MORE_RUNS }) });
    } catch (error) {
      toasts.show({
        text: messages.textFor({ error, fallback: t("errors.actionFailed") }),
        tone: "error",
      });
    } finally {
      isKeeping.value = false;
    }
  }

  // The runs of the open entry, loaded again for every other entry
  void lookups.loadEntities();

  const selectedRunId = ref<string | null>(null);

  watch(
    () => entry.value.entityId,
    (entityId) => {
      selectedRunId.value = null;
      void traces.load(entityId);
    },
    { immediate: true },
  );

  const history = computed(() =>
    traces.current?.entityId === entry.value.entityId ? traces.current : null,
  );
  const selected = computed(
    () =>
      history.value?.runs.find((run) => run.runId === selectedRunId.value) ??
      history.value?.runs[0] ??
      null,
  );

  function select(runId: string): void {
    selectedRunId.value = runId;
  }

  // What the list and the detail show
  const groups = computed(() => {
    const now = new Date();
    const result: { day: string; runs: Run[] }[] = [];

    for (const run of history.value?.runs ?? []) {
      const day = dayText({ iso: run.startedAt, now });
      const last = result[result.length - 1];
      if (last?.day === day) last.runs.push(run);
      else result.push({ day, runs: [run] });
    }

    return result;
  });

  const keepText = computed(() =>
    t(`history.keep.${entry.value.kind === "script" ? "script" : "automation"}`, {
      count: history.value?.storedTraces ?? DEFAULT_STORED_TRACES,
    }),
  );

  const states = computed(() =>
    selected.value && flow.value
      ? runStatesFor({ run: selected.value, flow: flow.value })
      : new Map(),
  );

  const sections = computed(() => {
    const current = flow.value;
    if (!current) return [];
    if (entry.value.kind === "script") return [{ key: "sequence", blocks: current.actions }];

    return [
      { key: "triggers", blocks: current.triggers },
      { key: "conditions", blocks: current.conditions },
      { key: "actions", blocks: current.actions },
    ];
  });

  return {
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
  };
}
