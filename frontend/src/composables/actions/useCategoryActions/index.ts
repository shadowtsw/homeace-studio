import { ref, type Ref } from "vue";
import { useI18n } from "vue-i18n";

import { useMessagesStore } from "@/stores/messagesStore";
import { useToastStore } from "@/stores/toastStore";
import type { EntityOption } from "@/types/editor";
import type { TidyMove } from "@/utils/areas/areaTidy";

import { useAreaTidy } from "./areaTidy";
import { useEntryMoves } from "./entryMoves";
import { useFolderOrder, type SaveOrderOptions } from "./folderOrder";
import { useFolderRenames } from "./folderRenames";

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
  const messages = useMessagesStore();
  const toasts = useToastStore();

  const isBusy = ref(false);

  function showError(error: unknown): void {
    toasts.show({
      text: messages.textFor({ error, fallback: t("errors.actionFailed") }),
      tone: "error",
    });
  }

  return {
    isBusy,
    ...useEntryMoves({ isBusy, showError }),
    ...useFolderRenames({ isBusy, showError }),
    ...useFolderOrder({ showError }),
    ...useAreaTidy({ isBusy, showError }),
  };
}
