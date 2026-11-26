import { defineStore } from "pinia";
import { computed, ref, watch } from "vue";

import { usePreference } from "@/composables/usePreference";
import { CATEGORY_FILTER, SCOPE_ALL, type ListScope } from "@/constants/entries";
import { PREFERENCES } from "@/constants/preferences";
import { showsEntities, toggleScope, validScopes } from "@/utils/entries/listScopes";

/** What the user is looking at: tree selection, filters, search, the open entry and ticked rows. */
export const useStudioStore = defineStore("studio", () => {
  const category = ref<string>(CATEGORY_FILTER.all);
  /** The chosen filters; kept on this device, so the list looks the same after reloading. */
  const storedScopes = usePreference<ListScope[]>({
    preference: PREFERENCES.listScopes,
    defaultValue: [SCOPE_ALL],
  });
  const scopes = computed<ListScope[]>(() => validScopes(storedScopes.value));
  const isShowingEntities = computed(() => showsEntities(scopes.value));
  const search = ref("");
  const selectedEntityId = ref<string | null>(null);
  /** Rows ticked for moving several entries at once. */
  const checkedIds = ref<ReadonlySet<string>>(new Set());
  /** Plain entities ticked for moving several into a folder; never together with ticked entries. */
  const checkedEntityIds = ref<ReadonlySet<string>>(new Set());
  /** An entry being renamed in place: in its list row or in the detail title. */
  const renaming = ref<{ entityId: string; place: "list" | "title" } | null>(null);

  function startRename(entityId: string, place: "list" | "title"): void {
    renaming.value = { entityId, place };
  }

  function stopRename(): void {
    renaming.value = null;
  }

  /** A plain click: only this filter. */
  function selectScope(scope: ListScope): void {
    storedScopes.value = [scope];
  }

  /** Strg/⌘+Klick or the filter's menu: add or remove it. */
  function toggleListScope(scope: ListScope): void {
    storedScopes.value = toggleScope(scopes.value, scope);
  }

  function selectCategory(path: string): void {
    category.value = path;
  }

  function selectEntry(entityId: string | null): void {
    selectedEntityId.value = entityId;
  }

  /**
   * Ticks or unticks entries. Ticking clears ticked entities, so the selection bar always fits.
   *
   * @returns Whether ticked entities were cleared for it.
   */
  function setChecked(entityIds: readonly string[], isChecked: boolean): boolean {
    checkedIds.value = withChecked({ ids: checkedIds.value, changed: entityIds, isChecked });

    const clearsOther = isChecked && checkedEntityIds.value.size > 0;
    if (clearsOther) checkedEntityIds.value = new Set();
    return clearsOther;
  }

  /**
   * Ticks or unticks plain entities. Ticking clears ticked entries.
   *
   * @returns Whether ticked entries were cleared for it.
   */
  function setEntityChecked(entityIds: readonly string[], isChecked: boolean): boolean {
    checkedEntityIds.value = withChecked({
      ids: checkedEntityIds.value,
      changed: entityIds,
      isChecked,
    });

    const clearsOther = isChecked && checkedIds.value.size > 0;
    if (clearsOther) checkedIds.value = new Set();
    return clearsOther;
  }

  function clearChecked(): void {
    if (checkedIds.value.size > 0) checkedIds.value = new Set();
    if (checkedEntityIds.value.size > 0) checkedEntityIds.value = new Set();
  }

  // Ticked rows belong to what is on screen; another folder or filter starts fresh.
  watch([category, scopes], clearChecked);

  return {
    category,
    scopes,
    isShowingEntities,
    selectScope,
    toggleListScope,
    search,
    selectedEntityId,
    checkedIds,
    checkedEntityIds,
    renaming,
    startRename,
    stopRename,
    selectCategory,
    selectEntry,
    setChecked,
    setEntityChecked,
    clearChecked,
  };
});

type CheckChange = { ids: ReadonlySet<string>; changed: readonly string[]; isChecked: boolean };

/** A new set with the changed IDs ticked or unticked. */
function withChecked(change: CheckChange): ReadonlySet<string> {
  const next = new Set(change.ids);

  for (const id of change.changed) {
    if (change.isChecked) next.add(id);
    else next.delete(id);
  }

  return next;
}
