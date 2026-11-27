<template>
  <LabelPicker
    :field="field"
    :labels="lookups.labels"
    :checked-ids="bulkLabels.all"
    :partial-ids="bulkLabels.some"
    :counts="labelActions.counts.value"
    :is-busy="labelActions.isBusy.value"
    @toggle="
      (labelId) => labelActions.toggleOnEntries({ labelId, entityIds: [...studio.checkedIds] })
    "
    @create="createBulkLabel"
    @update="(labelId, fields) => void labelActions.update({ labelId, fields })"
    @delete="deleteBulkLabel"
    @close="emit('close')"
  />
</template>

<script setup lang="ts">
import { computed } from "vue";

import { useLabelActions } from "@/composables/actions/useLabelActions";
import { useEntriesStore } from "@/stores/entriesStore";
import { useLookupsStore } from "@/stores/lookupsStore";
import { useStudioStore } from "@/stores/studioStore";
import type { Label } from "@/types/entry";

import LabelPicker from "./LabelPicker.vue";

/** The label picker for the ticked rows (Mehrfachauswahl), opened at the bulk bar. */
defineProps<{
  /** The bulk bar the picker opens at. */
  field: HTMLElement;
}>();

const emit = defineEmits<{
  close: [];
}>();

const studio = useStudioStore();
const entriesStore = useEntriesStore();
const lookups = useLookupsStore();
const labelActions = useLabelActions();

/** Labels on every ticked entry (ticked in the picker) and on some of them (a dash). */
const bulkLabels = computed(() => {
  const ticked = entriesStore.entries.filter((entry) => studio.checkedIds.has(entry.entityId));
  const countOf = new Map<string, number>();
  for (const entry of ticked)
    for (const label of entry.labels)
      countOf.set(label.labelId, (countOf.get(label.labelId) ?? 0) + 1);
  const all = [...countOf].filter(([, count]) => count === ticked.length).map(([id]) => id);
  const some = [...countOf].filter(([, count]) => count < ticked.length).map(([id]) => id);

  return { all, some };
});

/** A new label goes to every ticked entry at once. */
async function createBulkLabel(name: string): Promise<void> {
  const label = await labelActions.create(name);
  if (label)
    await labelActions.toggleOnEntries({
      labelId: label.labelId,
      entityIds: [...studio.checkedIds],
    });
}

function deleteBulkLabel(label: Label): void {
  emit("close");
  void labelActions.startDelete(label);
}
</script>
