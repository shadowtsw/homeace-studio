import { ref, type Ref } from "vue";
import { useI18n } from "vue-i18n";

import { CATEGORY_SEPARATOR } from "@/constants/entries";
import { moveEntityToFolder } from "@/services/editorService";
import { useEntriesStore } from "@/stores/entriesStore";
import { useLookupsStore } from "@/stores/lookupsStore";
import type { EntityOption } from "@/types/editor";
import type { TidyMove } from "@/utils/areas/areaTidy";
import { useFoldersStore } from "@/stores/foldersStore";
import { useMessagesStore } from "@/stores/messagesStore";
import { useStudioStore } from "@/stores/studioStore";
import { useToastStore } from "@/stores/toastStore";

type SaveOrderOptions = {
  parent: string;
  order: string[];
  /** The order before, for "Rückgängig". */
  previous: string[];
};

type CategoryActions = {
  /** A move or rename is running; controls lock meanwhile. */
  isBusy: Ref<boolean>;
  /** The folder in the rename dialog; null when the dialog is closed. */
  renamingPath: Ref<string | null>;
  moveEntry: (options: { entityId: string; categoryPath: string | null }) => Promise<void>;
  /** The entries in the "move to" dialog; null when it is closed. */
  movingIds: Ref<string[] | null>;
  startMoveMany: (entityIds: string[]) => void;
  cancelMoveMany: () => void;
  /** Moves several entries; null takes them out of their category. Clears the ticked rows. */
  moveEntries: (options: { entityIds: string[]; categoryPath: string | null }) => Promise<void>;
  /** The plain entity in the "move to" dialog; null when it is closed. */
  movingEntity: Ref<EntityOption | null>;
  startMoveEntity: (entity: EntityOption) => void;
  cancelMoveEntity: () => void;
  /** Puts a plain entity (light, sensor …) into a folder; null takes it out. */
  moveEntity: (options: { entityId: string; categoryPath: string | null }) => Promise<void>;
  startRename: (path: string) => void;
  cancelRename: () => void;
  confirmRename: (newPath: string) => Promise<void>;
  /** The folder renamed in place in the tree (double click); null when none. */
  inlineRenamingPath: Ref<string | null>;
  startInlineRename: (path: string) => void;
  cancelInlineRename: () => void;
  /** Renames the last level of a folder in place, with "Rückgängig" in the toast. */
  renameInline: (options: { path: string; name: string }) => Promise<void>;
  /** Saves siblings in a new order (own order, only in HomeAce Studio), with "Rückgängig". */
  saveOrder: (options: SaveOrderOptions) => Promise<void>;
  /** Back to A–Z everywhere, with "Rückgängig". */
  resetOrder: () => Promise<void>;
  /** "Ordnung in einem Klick" is open. */
  isAreaTidyOpen: Ref<boolean>;
  startAreaTidy: () => void;
  cancelAreaTidy: () => void;
  /**
   * Moves every entry into the folder of its area. @returns The first folder, to open it; null when
   * nothing moved.
   */
  confirmAreaTidy: (moves: readonly TidyMove[]) => Promise<string | null>;
};

/**
 * Moving entries and renaming folders, with feedback as toasts.
 * Errors from the backend are shown with the text from its catalog.
 */
export function useCategoryActions(): CategoryActions {
  const { t } = useI18n();
  const entriesStore = useEntriesStore();
  const foldersStore = useFoldersStore();
  const messages = useMessagesStore();
  const toasts = useToastStore();
  const studio = useStudioStore();
  const lookups = useLookupsStore();

  const isBusy = ref(false);
  const renamingPath = ref<string | null>(null);
  const movingIds = ref<string[] | null>(null);
  const movingEntity = ref<EntityOption | null>(null);

  function showError(error: unknown): void {
    toasts.show({
      text: messages.textFor({ error, fallback: t("errors.actionFailed") }),
      tone: "error",
    });
  }

  async function moveEntry({
    entityId,
    categoryPath,
  }: {
    entityId: string;
    categoryPath: string | null;
  }): Promise<void> {
    const entry = entriesStore.entries.find((item) => item.entityId === entityId);

    // Dropping an entry on the folder it is already in does nothing.
    if (!entry || entry.categoryPath === categoryPath) return;

    isBusy.value = true;

    try {
      await entriesStore.moveEntry({ entityId, categoryPath });
      const text = categoryPath
        ? t("toast.moved", { name: entry.name, path: categoryPath })
        : t("toast.movedOut", { name: entry.name });
      toasts.show({ text });
    } catch (error) {
      showError(error);
    } finally {
      isBusy.value = false;
    }
  }

  async function moveEntity({
    entityId,
    categoryPath,
  }: {
    entityId: string;
    categoryPath: string | null;
  }): Promise<void> {
    // Already there, or HA has no registry entry for it (then it cannot have a folder)
    const entity = lookups.entities.find((item) => item.entityId === entityId);
    if (!entity || entity.categoryPath === categoryPath) return;
    if (!entity.isInRegistry) {
      toasts.show({ text: t("entityRow.hintNoFolder"), tone: "error" });
      return;
    }

    isBusy.value = true;

    try {
      // Move in HA, then read the entities again so list and tree show it
      await moveEntityToFolder({ entityId, categoryPath });
      await lookups.loadEntities(true);
      movingEntity.value = null;

      const name = entity.name;
      toasts.show({
        text: categoryPath
          ? t("toast.entityMoved", { name, path: categoryPath })
          : t("toast.entityMovedOut", { name }),
      });
    } catch (error) {
      showError(error);
    } finally {
      isBusy.value = false;
    }
  }

  async function moveEntries({
    entityIds,
    categoryPath,
  }: {
    entityIds: string[];
    categoryPath: string | null;
  }): Promise<void> {
    if (entityIds.length === 0) return;

    isBusy.value = true;

    try {
      const { failed } = await entriesStore.moveEntries({ entityIds, categoryPath });
      const moved = entityIds.length - failed.length;

      if (moved > 0) {
        toasts.show({
          text: categoryPath
            ? t("toast.movedMany", { count: moved, path: categoryPath }, moved)
            : t("toast.movedOutMany", { count: moved }, moved),
        });
      }

      if (failed.length > 0) {
        const reason = messages.textFor({
          error: failed[0]?.error,
          fallback: t("errors.actionFailed"),
        });
        toasts.show({
          text: t("toast.moveFailed", { count: failed.length, reason }, failed.length),
          tone: "error",
        });
      }

      movingIds.value = null;
      studio.setChecked({
        entityIds: entityIds.filter((id) => !failed.some((item) => item.entityId === id)),
        isChecked: false,
      });
    } finally {
      isBusy.value = false;
    }
  }

  function startRename(path: string): void {
    renamingPath.value = path;
  }

  function cancelRename(): void {
    renamingPath.value = null;
  }

  const isAreaTidyOpen = ref(false);

  async function confirmAreaTidy(moves: readonly TidyMove[]): Promise<string | null> {
    if (moves.length === 0) return null;

    isBusy.value = true;

    try {
      const { failed } = await entriesStore.moveEach(
        moves.map((move) => ({ entityId: move.entry.entityId, categoryPath: move.to })),
      );
      const done = moves.filter(
        (move) => !failed.some((item) => item.entityId === move.entry.entityId),
      );
      const folders = [...new Set(done.map((move) => move.to))];

      if (done.length > 0) {
        toasts.show({
          text: t(
            "areas.tidy.done",
            {
              count: done.length,
              folders: t("areas.tidy.folders", { count: folders.length }, folders.length),
            },
            done.length,
          ),
        });
      }

      if (failed.length > 0) {
        const reason = messages.textFor({
          error: failed[0]?.error,
          fallback: t("errors.actionFailed"),
        });
        toasts.show({
          text: t("toast.moveFailed", { count: failed.length, reason }, failed.length),
          tone: "error",
        });
      }

      isAreaTidyOpen.value = false;
      return folders[0] ?? null;
    } finally {
      isBusy.value = false;
    }
  }

  const inlineRenamingPath = ref<string | null>(null);

  /** Renames a folder in every scope; the open folder follows. @returns Whether it worked. */
  async function renameFolder({
    from,
    to,
    isUndo,
  }: {
    from: string;
    to: string;
    isUndo: boolean;
  }): Promise<boolean> {
    isBusy.value = true;

    try {
      await entriesStore.renameCategory({ from, to });
      await foldersStore.load();
      if (studio.category === from || studio.category.startsWith(`${from}${CATEGORY_SEPARATOR}`)) {
        studio.selectCategory(to + studio.category.slice(from.length));
      }
      const last = (path: string): string => path.split(CATEGORY_SEPARATOR).pop() ?? path;
      if (isUndo) toasts.show({ text: t("toast.undone") });
      else {
        toasts.show({
          text: t("toast.renamedFolder", { from: last(from), to: last(to) }),
          tone: "success",
          undo: () => {
            void renameFolder({ from: to, to: from, isUndo: true });
          },
        });
      }
      return true;
    } catch (error) {
      showError(error);
      return false;
    } finally {
      isBusy.value = false;
    }
  }

  async function saveOrder({ parent, order, previous }: SaveOrderOptions): Promise<void> {
    try {
      await foldersStore.setOrder({ parent, children: order });
      toasts.show({
        text: t("toast.orderSaved"),
        tone: "success",
        undo: () => {
          void foldersStore.setOrder({ parent, children: previous }).catch(showError);
        },
      });
    } catch (error) {
      showError(error);
    }
  }

  async function resetOrder(): Promise<void> {
    const before = { ...foldersStore.order };
    try {
      for (const parent of Object.keys(before))
        await foldersStore.setOrder({ parent, children: [] });
      toasts.show({
        text: t("toast.orderReset"),
        tone: "success",
        undo: () => {
          void (async () => {
            for (const [parent, order] of Object.entries(before))
              await foldersStore.setOrder({ parent, children: order });
          })().catch(showError);
        },
      });
    } catch (error) {
      showError(error);
    }
  }

  async function renameInline({ path, name }: { path: string; name: string }): Promise<void> {
    inlineRenamingPath.value = null;
    if (name.includes(CATEGORY_SEPARATOR)) {
      toasts.show({ text: t("nav.slashInName"), tone: "error" });
      return;
    }
    const levels = path.split(CATEGORY_SEPARATOR);
    const to = [...levels.slice(0, -1), name].join(CATEGORY_SEPARATOR);
    if (to !== path) await renameFolder({ from: path, to, isUndo: false });
  }

  async function confirmRename(newPath: string): Promise<void> {
    const from = renamingPath.value;

    if (!from) return;

    isBusy.value = true;

    try {
      const renamedCount = await entriesStore.renameCategory({ from, to: newPath });
      // Empty folders below it were renamed in the overlay too.
      await foldersStore.load();
      toasts.show({ text: t("toast.renamed", { count: renamedCount }, renamedCount) });
      renamingPath.value = null;
    } catch (error) {
      showError(error);
    } finally {
      isBusy.value = false;
    }
  }

  return {
    isBusy,
    renamingPath,
    moveEntry,
    movingIds,
    startMoveMany: (entityIds) => (movingIds.value = entityIds),
    cancelMoveMany: () => (movingIds.value = null),
    moveEntries,
    movingEntity,
    startMoveEntity: (entity) => (movingEntity.value = entity),
    cancelMoveEntity: () => (movingEntity.value = null),
    moveEntity,
    startRename,
    cancelRename,
    confirmRename,
    inlineRenamingPath,
    startInlineRename: (path) => (inlineRenamingPath.value = path),
    cancelInlineRename: () => (inlineRenamingPath.value = null),
    renameInline,
    saveOrder,
    resetOrder,
    isAreaTidyOpen,
    startAreaTidy: () => (isAreaTidyOpen.value = true),
    cancelAreaTidy: () => (isAreaTidyOpen.value = false),
    confirmAreaTidy,
  };
}
