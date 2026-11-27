<template>
  <span class="run-result-dot" :class="`run-result-dot--${RUN_RESULT_TONE[result]}`">
    <span class="mdi" :class="RUN_RESULT_ICON[result]" />
  </span>
</template>

<script setup lang="ts">
import { RUN_RESULT_ICON, RUN_RESULT_TONE } from "@/constants/traces";
import type { RunResult } from "@/services/tracesService";

/** The round icon of a run's result, colored by how it went. */
defineProps<{
  result: RunResult;
}>();
</script>

<style scoped>
.run-result-dot {
  display: grid;
  flex: none;
  place-items: center;
  width: 24px;
  height: 24px;
  border-radius: 50%;
  font-size: 14px;
}

.run-result-dot--ok {
  background: var(--ok-soft);
  color: var(--ok);
}

.run-result-dot--warn {
  background: var(--warn-soft);
  color: var(--warn);
}

.run-result-dot--err {
  background: var(--err-soft);
  color: var(--err);
}

.run-result-dot--run {
  background: var(--accent-soft);
  color: var(--accent);
}

.run-result-dot--none {
  background: var(--sunken);
  color: var(--muted);
}
</style>
