<template>
  <RunOverlayBar
    v-if="shownRun"
    :run="shownRun"
    @to-history="emit('toHistory')"
    @hide="traces.showOnFlow(null)"
  />
  <FlowView
    :entity-id="entry.entityId"
    :flow="displayFlow"
    :kind="entry.kind === 'script' ? 'script' : 'automation'"
    :is-loading="editorStore.isFlowLoading"
    :has-error="editorStore.hasFlowError"
    :is-editable="editorStore.flow?.isEditable ?? false"
    :is-technical-details-visible="isTechnicalDetailsVisible"
    :catalog="catalog"
    :area-id="entry.area?.areaId ?? null"
    :run-states="shownRunStates"
    @change="(change) => editorStore.applyChange(change)"
  />
</template>

<script setup lang="ts">
import { computed } from "vue";

import FlowView from "@/components/flow/FlowView.vue";
import RunOverlayBar from "@/components/history/RunOverlayBar.vue";
import { useEditorStore } from "@/stores/editorStore";
import { useTracesStore } from "@/stores/tracesStore";
import type { DisplayFlow, EditorCatalog } from "@/types/editor";
import type { Entry } from "@/types/entry";
import { runStatesFor } from "@/utils/runs/runStates";

/**
 * The flow tab of an automation or script. A run put on the flow from the history ("Im Ablauf
 * zeigen") marks its steps on the blocks.
 */
const props = defineProps<{
  entry: Entry;
  /** The flow as shown; null while loading. */
  displayFlow: DisplayFlow | null;
  /** Block types for adding; null until HA sent them. */
  catalog: EditorCatalog | null;
  isTechnicalDetailsVisible: boolean;
}>();

const emit = defineEmits<{
  /** The run bar's way back to the history. */
  toHistory: [];
}>();

const editorStore = useEditorStore();
const traces = useTracesStore();

/** The run shown on the flow, while it belongs to this entry. */
const shownRun = computed(() => {
  const history = traces.current;
  if (history?.entityId !== props.entry.entityId) return null;
  return history.runs.find((run) => run.runId === traces.shownRunId) ?? null;
});
const shownRunStates = computed(() =>
  shownRun.value && props.displayFlow
    ? runStatesFor({ run: shownRun.value, flow: props.displayFlow })
    : null,
);
</script>
