import { defineStore } from "pinia";
import { ref, shallowRef } from "vue";

import type { Area } from "@/types/entry";

/** The area dialog: a new area (with what to do with it afterwards) or an existing one. */
export type AreaDraft =
  { area: null; onCreated: ((area: Area) => void) | null } | { area: Area; onCreated: null };

/**
 * Which area dialog is open. A store, because the properties form deep in the detail opens the
 * same dialog as the area tree; AreaDialogs shows it and useAreaActions saves.
 */
export const useAreasStore = defineStore("areas", () => {
  const draft = shallowRef<AreaDraft | null>(null);
  const deleting = ref<Area | null>(null);
  /** Ticked entries waiting for "Bereich setzen". */
  const settingIds = ref<string[] | null>(null);

  /** @param onCreated - Called with the new area, e.g. to select it in a form. */
  function startCreate(onCreated: ((area: Area) => void) | null = null): void {
    draft.value = { area: null, onCreated };
  }

  function startEdit(area: Area): void {
    draft.value = { area, onCreated: null };
  }

  function startDelete(area: Area): void {
    deleting.value = area;
  }

  function startSetArea(entityIds: string[]): void {
    settingIds.value = entityIds;
  }

  function closeDraft(): void {
    draft.value = null;
  }

  function closeDelete(): void {
    deleting.value = null;
  }

  function closeSetArea(): void {
    settingIds.value = null;
  }

  return {
    draft,
    deleting,
    settingIds,
    startCreate,
    startEdit,
    startDelete,
    startSetArea,
    closeDraft,
    closeDelete,
    closeSetArea,
  };
});
