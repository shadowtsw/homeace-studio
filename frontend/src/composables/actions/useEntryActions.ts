import { ref, type Ref, nextTick } from "vue";
import { useI18n } from "vue-i18n";

import type { EntryAction } from "@/constants/entries";
import { useEntriesStore } from "@/stores/entriesStore";
import { useFoldersStore } from "@/stores/foldersStore";
import { duplicateEntry } from "@/services/entriesService";
import { renameEntity } from "@/services/renameService";
import { useMessagesStore } from "@/stores/messagesStore";
import { useStudioStore } from "@/stores/studioStore";
import { useToastStore } from "@/stores/toastStore";
import type { Entry, EntryChanges } from "@/types/entry";

type EntryActions = {
  isBusy: Ref<boolean>;
  /** The helper waiting for "really delete?"; null when no confirmation is open. */
  deletingEntry: Ref<Entry | null>;
  save: (options: { entityId: string; changes: EntryChanges }) => Promise<boolean>;
  /** Renames in HA with "Rückgängig" in the toast. */
  rename: (options: { entry: Entry; name: string }) => Promise<void>;
  /** The inline name field (list row or title) was confirmed: closes it and renames that entry. */
  renameInPlace: (options: { entityId: string; name: string }) => void;
  /** Copies an automation or script, opens the copy and lets the user name it right away. */
  duplicate: (options: { entry: Entry; place?: "list" | "title" }) => Promise<void>;
  act: (options: { entry: Entry; action: EntryAction }) => Promise<void>;
  toggleFavorite: (entry: Entry) => Promise<void>;
  saveNote: (options: { entry: Entry; note: string }) => Promise<void>;
  askDelete: (entry: Entry) => void;
  /** The entry in the "deaktivieren?" dialog; null when it is closed. */
  disablingEntry: Ref<Entry | null>;
  /** The entry in "Entity-ID ändern", with a suggested ID; null when it is closed. */
  renamingId: Ref<{ entry: Entry; preset: string | null } | null>;
  startRenameId: (options: { entry: Entry; preset: string | null }) => void;
  cancelRenameId: () => void;
  confirmRenameId: (options: { newEntityId: string; withReferences: boolean }) => Promise<void>;
  askDisable: (entry: Entry) => void;
  cancelDisable: () => void;
  confirmDisable: () => Promise<void>;
  cancelDelete: () => void;
  confirmDelete: () => Promise<void>;
  setFolderColor: (options: { path: string; color: string | null }) => Promise<void>;
};

/**
 * Editing an entry (name, icon, area, labels), actions (on, off, run), favorites, notes,
 * deleting helpers and folder colors, with toasts and catalog texts for errors.
 */
export function useEntryActions(): EntryActions {
  const { t } = useI18n();
  const entriesStore = useEntriesStore();
  const foldersStore = useFoldersStore();
  const messages = useMessagesStore();
  const toasts = useToastStore();

  const isBusy = ref(false);
  const deletingEntry = ref<Entry | null>(null);
  const disablingEntry = ref<Entry | null>(null);
  const renamingId = ref<{ entry: Entry; preset: string | null } | null>(null);
  const studio = useStudioStore();

  /** The entry gets its new ID; the open entry and every list follow it. */
  async function confirmRenameId({
    newEntityId,
    withReferences,
  }: {
    newEntityId: string;
    withReferences: boolean;
  }): Promise<void> {
    const current = renamingId.value;
    if (!current) return;

    await run({
      action: async () => {
        const result = await renameEntity({
          entityId: current.entry.entityId,
          newEntityId,
          withReferences,
        });
        await entriesStore.load();
        if (studio.selectedEntityId === current.entry.entityId) studio.selectEntry(result.entityId);

        const places = result.updated.reduce((sum, item) => sum + item.count, 0);
        toasts.show({
          text:
            places > 0
              ? t("renameId.doneWith", { id: result.entityId, count: places }, places)
              : t("renameId.done", { id: result.entityId }),
        });
        if (result.skipped.length > 0) {
          toasts.show({
            text: t("renameId.skipped", { count: result.skipped.length }, result.skipped.length),
            tone: "error",
          });
        }
        renamingId.value = null;
      },
    });
  }

  /** Runs one request; errors become an error toast. @returns Whether it worked. */
  async function run({
    action,
    successText,
  }: {
    action: () => Promise<void>;
    successText?: string;
  }): Promise<boolean> {
    isBusy.value = true;

    try {
      await action();
      if (successText) toasts.show({ text: successText });
      return true;
    } catch (error) {
      toasts.show({
        text: messages.textFor({ error, fallback: t("errors.actionFailed") }),
        tone: "error",
      });
      return false;
    } finally {
      isBusy.value = false;
    }
  }

  async function confirmDisable(): Promise<void> {
    const entry = disablingEntry.value;

    if (!entry) return;

    const isDone = await run({
      action: () =>
        entriesStore.updateEntry({ entityId: entry.entityId, changes: { isDisabled: true } }),
      successText: t("toast.disabled", { name: entry.name }),
    });

    if (isDone) disablingEntry.value = null;
  }

  async function confirmDelete(): Promise<void> {
    const entry = deletingEntry.value;

    if (!entry) return;

    const isDeleted = await run({
      action: () => entriesStore.deleteEntry(entry),
      successText: t("toast.deleted", { name: entry.name }),
    });

    if (isDeleted) deletingEntry.value = null;
  }

  async function rename({ entry, name }: { entry: Entry; name: string }): Promise<void> {
    const previous = entry.name;
    const isDone = await run({
      action: () => entriesStore.updateEntry({ entityId: entry.entityId, changes: { name } }),
    });
    if (!isDone) return;

    toasts.show({
      text: t("toast.renamedEntry", { name }),
      tone: "success",
      undo: () => {
        void run({
          action: () =>
            entriesStore.updateEntry({ entityId: entry.entityId, changes: { name: previous } }),
          successText: t("toast.undone"),
        });
      },
    });
  }

  return {
    isBusy,
    deletingEntry,
    save: ({ entityId, changes }) =>
      run({
        action: () => entriesStore.updateEntry({ entityId, changes }),
        successText: t("toast.saved"),
      }),
    duplicate: async ({ entry, place = "title" }) => {
      await run({
        action: async () => {
          const entityId = await duplicateEntry({
            entityId: entry.entityId,
            name: t("detail.copyName", { name: entry.name }),
          });
          await entriesStore.load();
          studio.selectEntry(entityId);
          // The name opens where the user started: in the list when the copy's row is shown there.
          await nextTick();
          const row = document.querySelector(`[data-entity-id="${CSS.escape(entityId)}"]`);
          studio.startRename({ entityId, place: place === "list" && row ? "list" : "title" });
          // An automation copy starts switched off; a helper copy starts with a fresh value.
          if (entry.kind === "automation") toasts.show({ text: t("toast.duplicatedOff") });
          else if (entry.kind === "helper") toasts.show({ text: t("toast.duplicatedHelper") });
          else toasts.show({ text: t("toast.duplicated") });
        },
      });
    },
    rename,
    renameInPlace: ({ entityId, name }) => {
      studio.stopRename();
      const entry = entriesStore.entries.find((item) => item.entityId === entityId);
      if (entry) void rename({ entry, name });
    },
    act: async ({ entry, action }) => {
      await run({
        action: () => entriesStore.runAction({ entityId: entry.entityId, action }),
        successText: t(`toast.action.${action}`, { name: entry.name }),
      });
    },
    toggleFavorite: async (entry) => {
      await run({
        action: () =>
          entriesStore.updateExtras({
            entityId: entry.entityId,
            extras: { isFavorite: !entry.isFavorite },
          }),
      });
    },
    saveNote: async ({ entry, note }) => {
      // Saving on blur without a change would only cause a request and a toast.
      if (note.trim() === (entry.note ?? "")) return;

      await run({
        action: () => entriesStore.updateExtras({ entityId: entry.entityId, extras: { note } }),
        successText: t("toast.noteSaved"),
      });
    },
    askDelete: (entry) => (deletingEntry.value = entry),
    disablingEntry,
    renamingId,
    startRenameId: ({ entry, preset }) => (renamingId.value = { entry, preset }),
    cancelRenameId: () => (renamingId.value = null),
    confirmRenameId,
    askDisable: (entry) => (disablingEntry.value = entry),
    cancelDisable: () => (disablingEntry.value = null),
    confirmDisable,
    cancelDelete: () => (deletingEntry.value = null),
    confirmDelete,
    setFolderColor: async ({ path, color }) => {
      await run({ action: () => foldersStore.setColor({ path, color }) });
    },
  };
}
