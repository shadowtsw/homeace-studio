<template>
  <ol class="sorting-stepper">
    <li v-for="(key, index) in STEP_KEYS" :key="key">
      <button
        class="sorting-stepper__step"
        :class="{ 'sorting-stepper__step--done': sorting.step > index + 1 && index < 3 }"
        type="button"
        :disabled="!canGo(index + 1)"
        :aria-current="sorting.step === index + 1 ? 'step' : undefined"
        @click="go(index + 1)"
      >
        <span class="sorting-stepper__number">{{ index + 1 }}</span>
        <span class="sorting-stepper__label">{{ t(`entitySorting.steps.${key}`) }}</span>
      </button>
    </li>
  </ol>
</template>

<script setup lang="ts">
import { useI18n } from "vue-i18n";

import { SORTING_STEP, useEntitySortingStore, type SortingStep } from "@/stores/entitySortingStore";

const props = defineProps<{
  /** Step 5 can be reopened once there is a result. */
  hasResult: boolean;
}>();

const STEP_KEYS = ["overview", "rules", "suggestions", "apply", "result"] as const;

const { t } = useI18n();
const sorting = useEntitySortingStore();

/** Steps 1–3 are free; "Anwenden" is reached through its button only, the result once there is one. */
function canGo(step: number): boolean {
  if (!sorting.home || sorting.step === SORTING_STEP.apply) return false;
  if (step <= SORTING_STEP.suggestions) return true;

  return step === SORTING_STEP.result && props.hasResult;
}

function go(step: number): void {
  sorting.goTo(step as SortingStep);
}
</script>

<style scoped>
.sorting-stepper {
  display: flex;
  gap: 2px;
  margin: 0 auto 0 8px;
  padding: 3px;
  list-style: none;
  border-radius: 10px;
  background: var(--sunken);
}

.sorting-stepper__step {
  display: flex;
  align-items: center;
  gap: 7px;
  height: 30px;
  padding: 0 11px;
  border: 0;
  border-radius: 7px;
  background: none;
  color: var(--muted);
  cursor: pointer;
  font-size: 13px;
  font-weight: 600;
}

.sorting-stepper__step:disabled {
  cursor: default;
  opacity: 0.55;
}

.sorting-stepper__step[aria-current="step"] {
  background: var(--surface);
  color: var(--fg);
  box-shadow: 0 1px 2px rgb(0 0 0 / 12%);
}

.sorting-stepper__number {
  display: grid;
  place-items: center;
  width: 19px;
  height: 19px;
  border-radius: 50%;
  background: var(--line);
  color: var(--muted);
  font-size: 11px;
  font-weight: 700;
}

.sorting-stepper__step[aria-current="step"] .sorting-stepper__number {
  background: var(--accent);
  color: var(--on-accent);
}

.sorting-stepper__step--done .sorting-stepper__number {
  background: var(--ok-soft);
  color: var(--ok);
}

@media (max-width: 640px) {
  .sorting-stepper {
    order: 3;
    width: 100%;
    margin: 0;
  }

  .sorting-stepper li {
    flex: 1;
  }

  .sorting-stepper__step {
    justify-content: center;
    width: 100%;
    padding: 0 4px;
  }

  .sorting-stepper__label {
    display: none;
  }

  .sorting-stepper__step[aria-current="step"] .sorting-stepper__label {
    display: inline;
  }
}
</style>
