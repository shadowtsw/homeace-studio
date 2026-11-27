import { ref, type Ref } from "vue";
import { useI18n } from "vue-i18n";

import { moveEntityToFolder } from "@/services/editorService";
import { useEntriesStore } from "@/stores/entriesStore";
import { useLookupsStore } from "@/stores/lookupsStore";
import { useMessagesStore } from "@/stores/messagesStore";
import { useStudioStore } from "@/stores/studioStore";
import { useToastStore } from "@/stores/toastStore";
import type { EntityOption } from "@/types/editor";

/** Moving entries and plain entities into folders: one, or the ticked ones together. */
export function useEntryMoves({
  isBusy,
  showError,
}: {
  isBusy: Ref<boolean>;
  showError: (error: unknown) => void;
}) {
  const { t } = useI18n();
  const entriesStore = useEntriesStore();
  const lookups = useLookupsStore();
  const messages = useMessagesStore();
  const studio = useStudioStore();
  const toasts = useToastStore();

  const movingIds = ref<string[] | null>(null);
  const movingEntity = ref<EntityOption | null>(null);

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

  return {
    moveEntry,
    movingIds,
    startMoveMany: (entityIds: string[]) => (movingIds.value = entityIds),
    cancelMoveMany: () => (movingIds.value = null),
    moveEntries,
    movingEntity,
    startMoveEntity: (entity: EntityOption) => (movingEntity.value = entity),
    cancelMoveEntity: () => (movingEntity.value = null),
    moveEntity,
  };
}
