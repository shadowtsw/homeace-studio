import { ref, type Ref } from "vue";
import { useI18n } from "vue-i18n";

import { createArea, deleteArea, updateArea } from "@/services/areasService";
import { useAreasStore } from "@/stores/areasStore";
import { useEntriesStore } from "@/stores/entriesStore";
import { useEntryAreasStore } from "@/stores/entryAreasStore";
import { useLookupsStore } from "@/stores/lookupsStore";
import { useMessagesStore } from "@/stores/messagesStore";
import { useStudioStore } from "@/stores/studioStore";
import { useToastStore } from "@/stores/toastStore";
import { areaFilter } from "@/utils/entries/entryFilter";

type RenameAreaOptions = {
  areaId: string;
  name: string;
  /** True when it reverts a rename: then without another "Rückgängig". */
  isUndo?: boolean;
};

type AreaActions = {
  isBusy: Ref<boolean>;
  /** Creates or saves the area of the open dialog. */
  saveDraft: (options: { name: string; icon: string | null }) => Promise<void>;
  confirmDelete: () => Promise<void>;
  /** Renames an area in place (double click), with "Rückgängig" in the toast. */
  renameArea: (options: RenameAreaOptions) => Promise<void>;
  /** Gives entries an own area in HA; null takes it away (derived areas stay). */
  setOwnArea: (options: { entityIds: readonly string[]; areaId: string | null }) => Promise<void>;
};

/** Creating, changing and deleting areas, and giving entries one, with feedback as toasts. */
export function useAreaActions(): AreaActions {
  const { t } = useI18n();
  const areas = useAreasStore();
  const lookups = useLookupsStore();
  const entriesStore = useEntriesStore();
  const entryAreas = useEntryAreasStore();
  const studio = useStudioStore();
  const toasts = useToastStore();
  const messages = useMessagesStore();
  const isBusy = ref(false);

  async function run(action: () => Promise<void>): Promise<void> {
    isBusy.value = true;

    try {
      await action();
    } catch (error) {
      toasts.show({
        text: messages.textFor({ error, fallback: t("errors.actionFailed") }),
        tone: "error",
      });
    } finally {
      isBusy.value = false;
    }
  }

  function saveDraft({ name, icon }: { name: string; icon: string | null }): Promise<void> {
    const draft = areas.draft;
    if (!draft) return Promise.resolve();

    return run(async () => {
      if (draft.area) {
        const saved = await updateArea({ areaId: draft.area.areaId, changes: { name, icon } });
        toasts.show({ text: t("areas.toast.saved", { name: saved.name }) });
        await lookups.load();
      } else {
        const created = await createArea({ name, icon });
        toasts.show({ text: t("areas.toast.created", { name: created.name }) });
        // The new area must be in the lists before a form selects it.
        await lookups.load();
        draft.onCreated?.(created);
      }

      areas.closeDraft();
      void entryAreas.load();
    });
  }

  function renameArea({ areaId, name, isUndo = false }: RenameAreaOptions): Promise<void> {
    const previous = lookups.areas.find((area) => area.areaId === areaId)?.name;
    if (!previous || previous === name) return Promise.resolve();

    return run(async () => {
      await updateArea({ areaId, changes: { name } });
      await lookups.load();
      void entryAreas.load();
      if (isUndo) toasts.show({ text: t("toast.undone") });
      else {
        toasts.show({
          text: t("toast.renamedFolder", { from: previous, to: name }),
          tone: "success",
          undo: () => {
            void renameArea({ areaId, name: previous, isUndo: true });
          },
        });
      }
    });
  }

  function confirmDelete(): Promise<void> {
    const area = areas.deleting;
    if (!area) return Promise.resolve();

    return run(async () => {
      await deleteArea(area.areaId);
      toasts.show({ text: t("areas.toast.deleted", { name: area.name }) });
      areas.closeDelete();
      if (studio.category === areaFilter(area.areaId)) studio.selectCategory(areaFilter(null));
      await Promise.all([lookups.load(), entriesStore.refresh()]);
      void entryAreas.load();
    });
  }

  function setOwnArea({
    entityIds,
    areaId,
  }: {
    entityIds: readonly string[];
    areaId: string | null;
  }): Promise<void> {
    return run(async () => {
      const failed: unknown[] = [];

      for (const entityId of entityIds) {
        try {
          await entriesStore.updateEntry({ entityId, changes: { areaId } });
        } catch (error) {
          failed.push(error);
        }
      }

      const done = entityIds.length - failed.length;
      const name = lookups.areas.find((area) => area.areaId === areaId)?.name ?? "";

      if (done > 0) {
        toasts.show({
          text: areaId
            ? t("areas.toast.assigned", { count: done, name }, done)
            : t("areas.toast.unassigned", { count: done }, done),
        });
      }
      if (failed.length > 0) {
        toasts.show({
          text: messages.textFor({ error: failed[0], fallback: t("errors.actionFailed") }),
          tone: "error",
        });
      }

      studio.setChecked({ entityIds: [...entityIds], isChecked: false });
      areas.closeSetArea();
      await entryAreas.load();
    });
  }

  return { isBusy, saveDraft, confirmDelete, setOwnArea, renameArea };
}
