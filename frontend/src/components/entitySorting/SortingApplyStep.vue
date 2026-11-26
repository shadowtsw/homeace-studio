<template>
  <div class="apply-step">
    <h2>{{ t("entitySorting.apply.title") }}</h2>
    <p>
      {{
        t("entitySorting.apply.progress", {
          done: progress?.done ?? 0,
          total: progress?.total ?? 0,
        })
      }}
    </p>
    <div
      class="apply-step__bar"
      role="progressbar"
      aria-valuemin="0"
      aria-valuemax="100"
      :aria-valuenow="percent"
    >
      <span :style="{ width: `${percent}%` }" />
    </div>
    <small>{{ t("entitySorting.apply.note") }}</small>
  </div>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { useI18n } from "vue-i18n";

import type { SortingProgress } from "@/composables/useSortingRun";

/** Step 4: the batches go to HA; one failing entity does not stop the rest. */
const props = defineProps<{
  progress: SortingProgress | null;
}>();

const { t } = useI18n();
const percent = computed(() =>
  props.progress
    ? Math.round((100 * props.progress.done) / Math.max(1, props.progress.total))
    : 100,
);
</script>

<style scoped>
.apply-step {
  display: grid;
  justify-items: center;
  gap: 14px;
  max-width: 560px;
  margin: 8vh auto 0;
  text-align: center;
}

.apply-step h2 {
  margin: 0;
  font: 700 24px/1.2 var(--font-display);
}

.apply-step p {
  margin: 0;
  color: var(--muted);
  font-variant-numeric: tabular-nums;
}

.apply-step small {
  color: var(--faint);
}

.apply-step__bar {
  width: 100%;
  height: 12px;
  overflow: hidden;
  border-radius: 6px;
  background: var(--sunken);
}

.apply-step__bar span {
  display: block;
  height: 100%;
  background: var(--accent);
  transition: width 0.15s linear;
}
</style>
