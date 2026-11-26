import { computed } from "vue";
import { useI18n } from "vue-i18n";

import type { LabelFields } from "@/services/labelsService";
import { useEntriesStore } from "@/stores/entriesStore";
import { useLabelsStore } from "@/stores/labelsStore";
import { useLookupsStore } from "@/stores/lookupsStore";
import { useMessagesStore } from "@/stores/messagesStore";
import { useToastStore } from "@/stores/toastStore";
import type { Label } from "@/types/entry";
import { freeLabelColor } from "@/utils/labelColors";

/**
 * Managing labels with feedback: creating, changing and deleting them (with toasts and the
 * backend's error texts), giving one to several entries at once, and how many entries carry each.
 */
export function useLabelActions() {
  const { t } = useI18n();
  const store = useLabelsStore();
  const lookups = useLookupsStore();
  const entriesStore = useEntriesStore();
  const toasts = useToastStore();
  const messages = useMessagesStore();

  const fail = (error: unknown): void =>
    toasts.show({
      text: messages.textFor({ error, fallback: t("errors.actionFailed") }),
      tone: "error",
    });

  /** How many entries carry each label, for the numbers in the picker. */
  const counts = computed(() => {
    const result: Record<string, number> = {};
    for (const entry of entriesStore.entries)
      for (const label of entry.labels) result[label.labelId] = (result[label.labelId] ?? 0) + 1;
    return result;
  });

  /** A new label gets a colour no other label has, so it stands out until the user picks one. */
  async function create(name: string): Promise<Label | null> {
    try {
      const color = freeLabelColor(lookups.labels.map((label) => label.color));
      const label = await store.create({ name, color });
      toasts.show({ text: t("labels.toast.created", { name: label.name }) });
      return label;
    } catch (error) {
      fail(error);
      return null;
    }
  }

  async function update({
    labelId,
    fields,
  }: {
    labelId: string;
    fields: LabelFields;
  }): Promise<boolean> {
    try {
      const label = await store.update({ labelId, fields });
      toasts.show({ text: t("labels.toast.updated", { name: label.name }) });
      return true;
    } catch (error) {
      fail(error);
      return false;
    }
  }

  async function startDelete(label: Label): Promise<void> {
    try {
      await store.startDelete(label);
    } catch (error) {
      fail(error);
    }
  }

  async function confirmDelete(): Promise<void> {
    try {
      const label = await store.confirmDelete();
      if (label) toasts.show({ text: t("labels.toast.deleted", { name: label.name }) });
    } catch (error) {
      fail(error);
    }
  }

  /**
   * Mehrfachauswahl: when every ticked entry has the label, it is taken away from all; otherwise
   * every ticked entry gets it. Each entry keeps its other labels.
   */
  async function toggleOnEntries({
    labelId,
    entityIds,
  }: {
    labelId: string;
    entityIds: readonly string[];
  }): Promise<void> {
    // Who has it now
    const entries = entriesStore.entries.filter((entry) => entityIds.includes(entry.entityId));
    const hasLabel = (entry: (typeof entries)[number]): boolean =>
      entry.labels.some((label) => label.labelId === labelId);
    const isRemoving = entries.length > 0 && entries.every(hasLabel);

    // Change only those that differ, one after another
    const changing = entries.filter((entry) => (isRemoving ? hasLabel(entry) : !hasLabel(entry)));
    try {
      for (const entry of changing) {
        const ids = entry.labels.map((label) => label.labelId);
        const labelIds = isRemoving ? ids.filter((id) => id !== labelId) : [...ids, labelId];
        await entriesStore.updateEntry({ entityId: entry.entityId, changes: { labelIds } });
      }

      const name = lookups.labels.find((label) => label.labelId === labelId)?.name ?? labelId;
      const count = changing.length;
      toasts.show({
        text: isRemoving
          ? t("labels.toast.removedMany", { name, count }, count)
          : t("labels.toast.addedMany", { name, count }, count),
      });
    } catch (error) {
      fail(error);
    }
  }

  return {
    counts,
    isBusy: computed(() => store.isBusy),
    deleting: computed(() => store.deleting),
    create,
    update,
    startDelete,
    confirmDelete,
    cancelDelete: store.cancelDelete,
    toggleOnEntries,
  };
}
