import { ref, type Ref } from "vue";
import { useI18n } from "vue-i18n";

import { CATEGORY_SEPARATOR } from "@/constants/entries";
import { useEntriesStore } from "@/stores/entriesStore";
import { useFoldersStore } from "@/stores/foldersStore";
import { useStudioStore } from "@/stores/studioStore";
import { useToastStore } from "@/stores/toastStore";

/** Renaming folders: in the dialog (the whole path) or in place in the tree (the last level). */
export function useFolderRenames({
  isBusy,
  showError,
}: {
  isBusy: Ref<boolean>;
  showError: (error: unknown) => void;
}) {
  const { t } = useI18n();
  const entriesStore = useEntriesStore();
  const foldersStore = useFoldersStore();
  const studio = useStudioStore();
  const toasts = useToastStore();

  const renamingPath = ref<string | null>(null);

  function startRename(path: string): void {
    renamingPath.value = path;
  }

  function cancelRename(): void {
    renamingPath.value = null;
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
    renamingPath,
    startRename,
    cancelRename,
    confirmRename,
    inlineRenamingPath,
    startInlineRename: (path: string) => (inlineRenamingPath.value = path),
    cancelInlineRename: () => (inlineRenamingPath.value = null),
    renameInline,
  };
}
