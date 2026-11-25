import { useLocalStorage } from "@vueuse/core";
import { defineStore } from "pinia";
import { computed, ref, watch } from "vue";

import { CATEGORY_FILTER, SCOPE_ALL, type ListScope } from "@/constants/entries";
import { showsEntities, toggleScope, validScopes } from "@/utils/listScopes";

const SCOPES_STORAGE_KEY = "homeace.scopes";

/** What the user is looking at: tree selection, filters, search, the open entry and ticked rows. */
export const useStudioStore = defineStore("studio", () => {
  const category = ref<string>(CATEGORY_FILTER.all);
  /** The chosen filters; kept in the browser, so the list looks the same after reloading. */
  const storedScopes = useLocalStorage<ListScope[]>(SCOPES_STORAGE_KEY, [SCOPE_ALL]);
  const scopes = computed<ListScope[]>(() => validScopes(storedScopes.value));
  const isShowingEntities = computed(() => showsEntities(scopes.value));
  const search = ref("");
  const selectedEntityId = ref<string | null>(null);
  /** Rows ticked for moving several entries at once. */
  const checkedIds = ref<ReadonlySet<string>>(new Set());
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

  function setChecked(entityIds: readonly string[], isChecked: boolean): void {
    const next = new Set(checkedIds.value);

    for (const entityId of entityIds) {
      if (isChecked) next.add(entityId);
      else next.delete(entityId);
    }

    checkedIds.value = next;
  }

  function clearChecked(): void {
    if (checkedIds.value.size > 0) checkedIds.value = new Set();
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
    renaming,
    startRename,
    stopRename,
    selectCategory,
    selectEntry,
    setChecked,
    clearChecked,
  };
});
