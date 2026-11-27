import { ref, type Ref } from "vue";
import { useI18n } from "vue-i18n";

import { useEntriesStore } from "@/stores/entriesStore";
import { useMessagesStore } from "@/stores/messagesStore";
import { useToastStore } from "@/stores/toastStore";
import type { TidyMove } from "@/utils/areas/areaTidy";

/**
 * "Ordnung in einem Klick": every entry into the folder of its area. Failed moves are named in a
 * toast of their own, so there is no error toast for the whole run.
 */
export function useAreaTidy({ isBusy }: { isBusy: Ref<boolean> }) {
  const { t } = useI18n();
  const entriesStore = useEntriesStore();
  const messages = useMessagesStore();
  const toasts = useToastStore();

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

  return {
    isAreaTidyOpen,
    startAreaTidy: () => (isAreaTidyOpen.value = true),
    cancelAreaTidy: () => (isAreaTidyOpen.value = false),
    confirmAreaTidy,
  };
}
