import { ref, type Ref } from "vue";
import { useI18n } from "vue-i18n";

import { moveEntityToFolder } from "@/services/editorService";
import { useLookupsStore } from "@/stores/lookupsStore";
import { useMessagesStore } from "@/stores/messagesStore";
import { useStudioStore } from "@/stores/studioStore";
import { useToastStore } from "@/stores/toastStore";

type EntityBulkMove = {
  /** The ticked entities waiting in the folder dialog; null while it is closed. */
  movingIds: Ref<string[] | null>;
  isBusy: Ref<boolean>;
  start: (entityIds: string[]) => void;
  cancel: () => void;
  /** Moves them into the folder (null: out of their folders), then unticks them. */
  move: (entityIds: readonly string[], categoryPath: string | null) => Promise<void>;
};

/** Several ticked plain entities into one folder at once, or out of their folders. */
export function useEntityBulkMove(): EntityBulkMove {
  const { t } = useI18n();
  const lookups = useLookupsStore();
  const messages = useMessagesStore();
  const studio = useStudioStore();
  const toasts = useToastStore();

  const movingIds = ref<string[] | null>(null);
  const isBusy = ref(false);

  async function move(entityIds: readonly string[], categoryPath: string | null): Promise<void> {
    // Only those that can have a folder and are not there yet
    const toMove = lookups.entities.filter(
      (entity) =>
        entityIds.includes(entity.entityId) &&
        entity.isInRegistry &&
        entity.categoryPath !== categoryPath,
    );
    isBusy.value = true;

    try {
      // One after another: each one creates or cleans up categories in HA
      for (const entity of toMove) {
        await moveEntityToFolder(entity.entityId, categoryPath);
      }

      // Read them again so list and tree show the new folders, then report
      await lookups.loadEntities(true);
      movingIds.value = null;
      studio.clearChecked();

      const count = entityIds.length;
      toasts.show(
        categoryPath
          ? t("toast.entitiesMoved", { count, path: categoryPath }, count)
          : t("toast.entitiesMovedOut", { count }, count),
      );
    } catch (error) {
      // Some may have moved already; the list shows where each one is
      await lookups.loadEntities(true);
      toasts.show(messages.textFor(error, t("errors.actionFailed")), "error");
    } finally {
      isBusy.value = false;
    }
  }

  return {
    movingIds,
    isBusy,
    start: (entityIds) => (movingIds.value = entityIds),
    cancel: () => (movingIds.value = null),
    move,
  };
}
