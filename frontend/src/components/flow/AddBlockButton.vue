<template>
  <button
    v-if="editing?.isEditable.value"
    type="button"
    class="add-block-button"
    @click="
      (event: MouseEvent) =>
        editing?.openTypePicker({ target, anchor: event.currentTarget as HTMLElement })
    "
  >
    <span class="mdi mdi-plus" /> {{ t(`flow.add.${target.section}`) }}
  </button>
</template>

<script setup lang="ts">
import { inject } from "vue";
import { useI18n } from "vue-i18n";

import type { AddTarget } from "@/types/editor";

import { FLOW_EDITING } from "./flowEditing";

/** "+ Auslöser", "+ Bedingung" or "+ Aktion" at the end of a list; opens the type picker. */
defineProps<{ target: AddTarget }>();

const { t } = useI18n();
const editing = inject(FLOW_EDITING, null);
</script>

<style scoped>
.add-block-button {
  justify-self: start;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  border: 1.5px dashed var(--line-strong);
  border-radius: 9px;
  background: transparent;
  color: var(--muted);
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
}

.add-block-button:hover {
  border-color: var(--section-color);
  background: var(--section-soft);
  color: var(--section-color);
}
</style>
