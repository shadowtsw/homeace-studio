<template>
  <div class="entity-picker__criteria">
    <button
      v-for="key in CRITERIA_KEYS"
      :key="key"
      type="button"
      class="entity-picker__criterion"
      :class="{
        'entity-picker__criterion--open': openCriterion === key,
        'entity-picker__criterion--set': criteria[key] !== null,
      }"
      :aria-expanded="openCriterion === key"
      @click="emit('toggleOpen', key)"
    >
      <span class="mdi" :class="CRITERION_ICON[key]" />
      {{ t(`picker.criteria.${key}`)
      }}<template v-if="criteria[key] !== null"
        >: {{ valueLabel({ key, value: criteria[key]! }) }}</template
      >
      <span class="mdi" :class="openCriterion === key ? 'mdi-chevron-up' : 'mdi-chevron-down'" />
    </button>
    <button v-if="hasCriteria" type="button" class="entity-picker__reset" @click="emit('reset')">
      {{ t("picker.reset") }}
    </button>
  </div>

  <div v-if="openCriterion" class="entity-picker__panel">
    <button
      v-for="option in choices"
      :key="option.value"
      type="button"
      class="entity-picker__chip"
      :class="{ 'entity-picker__chip--on': criteria[openCriterion] === option.value }"
      @click="emit('toggleCriterion', openCriterion, option.value)"
    >
      <span v-if="openCriterion === 'area'" class="mdi" :class="areaIcon(option.value)" />
      {{ valueLabel({ key: openCriterion, value: option.value }) }}
      <small>{{ option.count }}</small>
    </button>
  </div>
</template>

<script setup lang="ts">
import { useI18n } from "vue-i18n";

import { useLookupsStore } from "@/stores/lookupsStore";
import {
  CRITERIA_KEYS,
  NO_AREA,
  type CriterionKey,
  type CriterionOption,
  type PickerCriteria,
} from "@/utils/entities/entityPicker";
import { mdiIconClass } from "@/utils/text";

/** The entity picker's criteria (area, label, kind) as chips, and the values of the open one. */
defineProps<{
  criteria: PickerCriteria;
  openCriterion: CriterionKey | null;
  /** The values of the open criterion, with how many entities each has. */
  choices: CriterionOption[];
  hasCriteria: boolean;
}>();

const emit = defineEmits<{
  toggleOpen: [key: CriterionKey];
  /** One value per criterion, like radio buttons: another chip switches, the chosen one clears. */
  toggleCriterion: [key: CriterionKey, value: string];
  reset: [];
}>();

const CRITERION_ICON: Record<CriterionKey, string> = {
  area: "mdi-map-marker-outline",
  label: "mdi-label-outline",
  kind: "mdi-shape-outline",
};

const { t, te } = useI18n();
const lookups = useLookupsStore();

function valueLabel({ key, value }: { key: CriterionKey; value: string }): string {
  if (key === "area") return value === NO_AREA ? t("picker.noArea") : value;
  if (key === "kind") return te(`picker.kinds.${value}`) ? t(`picker.kinds.${value}`) : value;
  return value;
}

function areaIcon(value: string): string {
  const area = lookups.areas.find((item) => item.name === value);
  return mdiIconClass(area?.icon ?? null) ?? "mdi-map-marker-outline";
}
</script>

<style scoped>
.entity-picker__criteria {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 5px;
}

.entity-picker__criterion {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 4px 8px;
  border: 1px dashed var(--line-strong);
  border-radius: 8px;
  background: none;
  color: var(--muted);
  font-size: 12.5px;
  font-weight: 600;
  cursor: pointer;
}

.entity-picker__criterion:hover,
.entity-picker__criterion--open {
  border-style: solid;
  color: var(--fg);
}

.entity-picker__criterion--set {
  border-style: solid;
  border-color: var(--accent);
  background: var(--accent-soft);
  color: var(--accent);
}

.entity-picker__reset {
  margin-left: auto;
  border: 0;
  background: none;
  color: var(--muted);
  font-size: 12px;
  text-decoration: underline;
  cursor: pointer;
}

/* About three rows of chips; more scroll, so the results below always keep their room. */
.entity-picker__panel {
  display: flex;
  flex: none;
  flex-wrap: wrap;
  gap: 5px;
  max-height: 118px;
  overflow-y: auto;
  overscroll-behavior: contain;
  padding: 8px;
  border: 1px solid var(--line);
  border-radius: 10px;
  background: var(--surface-2);
}

.entity-picker__chip {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 4px 10px;
  border: 1px solid var(--line);
  border-radius: 999px;
  background: var(--surface);
  color: var(--muted);
  font-size: 12.5px;
  cursor: pointer;
}

.entity-picker__chip:hover {
  border-color: var(--line-strong);
  color: var(--fg);
}

.entity-picker__chip--on {
  border-color: var(--fg);
  background: var(--fg);
  color: var(--bg);
}

.entity-picker__chip small {
  opacity: 0.7;
  font-variant-numeric: tabular-nums;
}
</style>
