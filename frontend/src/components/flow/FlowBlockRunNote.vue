<template>
  <p class="flow-block-run-note" :class="`flow-block-run-note--${runStatusTone(runState.status)}`">
    <span class="flow-block-run-note__icon">
      <span class="mdi" :class="RUN_STATUS_ICON[runState.status]" />
    </span>
    <span>{{ runState.error ? errorText(runState.error) : noteOf(runState) }}</span>
  </p>
</template>

<script setup lang="ts">
import { RUN_STATUS_ICON, runStatusTone, useRunTexts } from "@/composables/texts/useRunTexts";
import type { BlockRunState } from "@/utils/runs/runStates";

/** The line below a block while a run is shown on the flow: what the block did in it. */
defineProps<{
  runState: BlockRunState;
}>();

const { noteOf, errorText } = useRunTexts();
</script>

<style scoped>
.flow-block-run-note {
  display: flex;
  align-items: center;
  gap: 6px;
  margin: 0;
  color: var(--muted);
  font-size: 12.5px;
}

.flow-block-run-note--err {
  color: var(--err);
}

.flow-block-run-note__icon {
  display: grid;
  flex: none;
  place-items: center;
  width: 18px;
  height: 18px;
  border-radius: 50%;
  background: var(--sunken);
  font-size: 12px;
}

.flow-block-run-note--ok .flow-block-run-note__icon {
  background: var(--ok-soft);
  color: var(--ok);
}

.flow-block-run-note--warn .flow-block-run-note__icon {
  background: var(--warn-soft);
  color: var(--warn);
}

.flow-block-run-note--err .flow-block-run-note__icon {
  background: var(--err-soft);
  color: var(--err);
}

.flow-block-run-note--run .flow-block-run-note__icon {
  background: var(--accent-soft);
  color: var(--accent);
}
</style>
