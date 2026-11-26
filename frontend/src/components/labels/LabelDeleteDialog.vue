<template>
  <DialogFrame
    :title="t('labels.deleteTitle', { name: label.name })"
    @close="emit('cancel')"
    @submit="emit('confirm')"
  >
    <p class="label-delete__intro">{{ t("labels.deleteIntro") }}</p>
    <ul class="label-delete__list">
      <li v-for="line in lines" :key="line">
        <span class="mdi mdi-label-off-outline" />{{ line }}
      </li>
      <li v-if="usage.flowsAsTarget.length > 0" class="label-delete__warn">
        <span class="mdi mdi-alert-outline" />
        {{ t("labels.usageFlows", { names: flowNames }) }}
      </li>
    </ul>
    <p class="label-delete__final">
      {{ t("labels.deleteFinal") }}
      <button type="button" class="label-delete__more" @click="emit('more')">
        {{ t("labels.moreInfo") }}
      </button>
    </p>

    <template #buttons>
      <button class="btn" type="button" :disabled="isBusy" @click="emit('cancel')">
        {{ t("common.cancel") }}
      </button>
      <button class="btn label-delete__danger" type="submit" :disabled="isBusy">
        <span class="mdi mdi-delete-outline" />{{ t("labels.deleteConfirm") }}
      </button>
    </template>
  </DialogFrame>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { useI18n } from "vue-i18n";

import DialogFrame from "@/components/common/DialogFrame.vue";
import type { LabelUsage } from "@/services/labelsService";
import type { Label } from "@/types/entry";

/** Before a label goes: everything HA takes it from, and flows that would do less without it. */
const props = defineProps<{ label: Label; usage: LabelUsage; isBusy: boolean }>();

const emit = defineEmits<{ confirm: []; cancel: []; more: [] }>();

const { t } = useI18n();

const lines = computed(() =>
  (
    [
      ["entries", props.usage.entries],
      ["entities", props.usage.entities],
      ["devices", props.usage.devices],
      ["areas", props.usage.areas],
    ] as const
  )
    .filter(([, count]) => count > 0)
    .map(([kind, count]) => t(`labels.usage.${kind}`, { count })),
);
const flowNames = computed(() =>
  props.usage.flowsAsTarget.map((flow) => t("common.quoted", { text: flow.name })).join(", "),
);
</script>

<style scoped>
.label-delete__intro,
.label-delete__final {
  margin: 0;
  font-size: 13.5px;
  line-height: 1.5;
}

.label-delete__final {
  color: var(--muted);
}

.label-delete__list {
  display: grid;
  gap: 6px;
  margin: 10px 0;
  padding: 0;
  list-style: none;
}

.label-delete__list li {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  font-size: 13.5px;
}

.label-delete__list .mdi {
  color: var(--muted);
}

.label-delete__warn,
.label-delete__warn .mdi {
  color: var(--warn);
}

.label-delete__danger {
  border-color: var(--err);
  background: var(--err);
  color: var(--on-accent, #fff);
}

.label-delete__more {
  padding: 0;
  border: 0;
  background: none;
  color: var(--accent);
  font: inherit;
  cursor: pointer;
}
</style>
