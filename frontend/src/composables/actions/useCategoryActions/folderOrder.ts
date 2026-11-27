import { useI18n } from "vue-i18n";

import { useFoldersStore } from "@/stores/foldersStore";
import { useToastStore } from "@/stores/toastStore";

export type SaveOrderOptions = {
  parent: string;
  order: string[];
  /** The order before, for "Rückgängig". */
  previous: string[];
};

/** The own order of folders (only in HomeAce Studio): saving it, and back to A–Z. */
export function useFolderOrder({ showError }: { showError: (error: unknown) => void }) {
  const { t } = useI18n();
  const foldersStore = useFoldersStore();
  const toasts = useToastStore();

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

  return { saveOrder, resetOrder };
}
