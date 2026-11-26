import { defineStore } from "pinia";
import { ref } from "vue";

import {
  createLabel,
  deleteLabel,
  fetchLabelUsage,
  updateLabel,
  type LabelFields,
  type LabelUsage,
} from "@/services/labelsService";
import type { Label } from "@/types/entry";

import { useEntriesStore } from "./entriesStore";
import { useLookupsStore } from "./lookupsStore";

/**
 * Creating, changing and deleting labels in HA. A label belongs to all of HA, so every change
 * reloads the label list and the entries (their chips show name and colour). Errors go to the caller.
 */
export const useLabelsStore = defineStore("labels", () => {
  const lookups = useLookupsStore();
  const entriesStore = useEntriesStore();

  const isBusy = ref(false);
  /** The label in the delete dialog with what deleting would touch; null when it is closed. */
  const deleting = ref<{ label: Label; usage: LabelUsage } | null>(null);

  async function busy<T>(work: () => Promise<T>): Promise<T> {
    isBusy.value = true;
    try {
      return await work();
    } finally {
      isBusy.value = false;
    }
  }

  const reload = (): Promise<unknown> => Promise.all([lookups.load(), entriesStore.refresh()]);

  /** A new label; no entry carries it yet, so only the label list reloads. */
  const create = ({ name, color }: { name: string; color: string | null }): Promise<Label> =>
    busy(async () => {
      const label = await createLabel({ name, color });
      await lookups.load();
      return label;
    });

  const update = ({ labelId, fields }: { labelId: string; fields: LabelFields }): Promise<Label> =>
    busy(async () => {
      const label = await updateLabel({ labelId, fields });
      await reload();
      return label;
    });

  /** Opens the delete dialog once HA said where the label is used. */
  const startDelete = (label: Label): Promise<void> =>
    busy(async () => {
      deleting.value = { label, usage: await fetchLabelUsage(label.labelId) };
    });

  /** Deletes the label of the open dialog. @returns The deleted label; null without a dialog. */
  const confirmDelete = (): Promise<Label | null> =>
    busy(async () => {
      const label = deleting.value?.label;
      if (!label) return null;

      await deleteLabel(label.labelId);
      deleting.value = null;
      await reload();
      return label;
    });

  function cancelDelete(): void {
    deleting.value = null;
  }

  return { isBusy, deleting, create, update, startDelete, confirmDelete, cancelDelete };
});
