<template>
  <button
    type="button"
    class="picker-row"
    :class="{ 'picker-row--on': isSelected }"
    @click="emit('pick', entity.entityId)"
  >
    <span class="mdi picker-row__icon" :class="icon" />
    <span class="picker-row__main">
      <b>{{ label }}</b>
      <small v-if="place || isTechnicalDetailsVisible">
        {{ place }}<template v-if="place && isTechnicalDetailsVisible"> · </template>
        <span v-if="isTechnicalDetailsVisible" class="mono">{{ entity.entityId }}</span>
      </small>
    </span>
    <span
      class="picker-row__state"
      :class="{ 'picker-row__state--off': entity.state === 'unavailable' }"
      >{{ stateText }}</span
    >
    <span v-if="isSelected" class="mdi mdi-check picker-row__check" />
  </button>
</template>

<script setup lang="ts">
import { computed } from "vue";

import { useStateText } from "@/composables/texts/useStateText";
import { DOMAIN_ICON, FALLBACK_DOMAIN_ICON } from "@/constants/domainIcons";
import type { EntityOption } from "@/types/editor";

/** One entity in the picker: icon, name, where it is, and its state right now. */
const props = defineProps<{
  entity: EntityOption;
  label: string;
  /** Area line under the name; absent inside an area view. */
  place?: string;
  isSelected: boolean;
  isTechnicalDetailsVisible: boolean;
}>();

const emit = defineEmits<{
  pick: [entityId: string];
}>();

const icon = computed(() => DOMAIN_ICON[props.entity.domain] ?? FALLBACK_DOMAIN_ICON);
const toStateText = useStateText();
const stateText = computed(() => toStateText(props.entity.state, props.entity.unit));
</script>

<style scoped>
.picker-row {
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;
  padding: 8px 10px;
  border: 0;
  border-top: 1px solid transparent;
  border-radius: 8px;
  background: none;
  text-align: left;
  cursor: pointer;
}

.picker-row:hover,
.picker-row:focus-visible {
  background: var(--sunken);
}

.picker-row--on {
  background: var(--accent-soft);
}

.picker-row__icon {
  color: var(--muted);
  font-size: 18px;
}

.picker-row__main {
  display: flex;
  flex: 1;
  flex-direction: column;
  min-width: 0;
}

.picker-row__main b {
  overflow: hidden;
  font-weight: 600;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.picker-row__main small {
  overflow: hidden;
  color: var(--faint);
  font-size: 11.5px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.picker-row__state {
  flex: none;
  max-width: 40%;
  overflow: hidden;
  padding: 2px 7px;
  border-radius: 6px;
  background: var(--sunken);
  color: var(--muted);
  font-size: 12px;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.picker-row__state--off {
  background: var(--warn-soft);
  color: var(--warn);
}

.picker-row__check {
  color: var(--accent);
}
</style>
