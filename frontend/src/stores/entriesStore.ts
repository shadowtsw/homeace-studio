import { defineStore } from "pinia";
import { ref } from "vue";

import { renameCategory as renameCategoryRequest } from "@/services/categoriesService";
import type { EntryAction } from "@/constants/entries";
import {
  fetchEntries,
  moveEntry as moveEntryRequest,
  runEntryAction,
  updateEntry as updateEntryRequest,
  updateEntryExtras,
} from "@/services/entriesService";
import {
  createFlow as createFlowRequest,
  deleteFlow as deleteFlowRequest,
  type NewFlow,
} from "@/services/flowsService";
import {
  createHelper as createHelperRequest,
  deleteHelper as deleteHelperRequest,
  type NewHelper,
} from "@/services/helpersService";
import type { Entry, EntryChanges } from "@/types/entry";

export const useEntriesStore = defineStore("entries", () => {
  const entries = ref<Entry[]>([]);
  const isLoading = ref(false);
  const hasLoadError = ref(false);

  async function load(): Promise<void> {
    isLoading.value = true;
    hasLoadError.value = false;

    try {
      entries.value = await fetchEntries();
    } catch (error) {
      hasLoadError.value = true;
      console.error("Loading entries failed", error);
    } finally {
      isLoading.value = false;
    }
  }

  /**
   * Reloads quietly, without the loading state, e.g. after a live change in HA.
   * Errors are only logged; the list keeps what it had.
   */
  async function refresh(): Promise<void> {
    try {
      entries.value = await fetchEntries();
      hasLoadError.value = false;
    } catch (error) {
      console.error("Refreshing entries failed", error);
    }
  }

  /**
   * Moves an entry, then reloads: the backend may have created or deleted categories on the way.
   * Errors go to the caller, which shows them.
   */
  async function moveEntry({
    entityId,
    categoryPath,
  }: {
    entityId: string;
    categoryPath: string | null;
  }): Promise<void> {
    await moveEntryRequest({ entityId, categoryPath });
    await load();
  }

  /**
   * Moves several entries, one after another: in parallel, two of them could both create the same
   * new category, and HA refuses the second. Reloads once at the end.
   *
   * @returns The IDs that could not be moved, with their errors.
   */
  function moveEntries({
    entityIds,
    categoryPath,
  }: {
    entityIds: readonly string[];
    categoryPath: string | null;
  }): Promise<{ failed: { entityId: string; error: unknown }[] }> {
    return moveEach(entityIds.map((entityId) => ({ entityId, categoryPath })));
  }

  /**
   * Like {@link moveEntries}, but every entry has its own target (sorting by area).
   *
   * @returns The IDs that could not be moved, with their errors.
   */
  async function moveEach(
    moves: readonly { entityId: string; categoryPath: string | null }[],
  ): Promise<{ failed: { entityId: string; error: unknown }[] }> {
    const failed: { entityId: string; error: unknown }[] = [];

    for (const { entityId, categoryPath } of moves) {
      try {
        await moveEntryRequest({ entityId, categoryPath });
      } catch (error) {
        failed.push({ entityId, error });
      }
    }

    await load();

    return { failed };
  }

  /** Renames a folder in all scopes, then reloads. Errors go to the caller. */
  async function renameCategory({ from, to }: { from: string; to: string }): Promise<number> {
    const renamedCount = await renameCategoryRequest({ from, to });
    await load();

    return renamedCount;
  }

  /** Creates a helper in HA, then reloads. Errors go to the caller. @returns The new entity ID. */
  async function createHelper(helper: NewHelper): Promise<string> {
    const entityId = await createHelperRequest(helper);
    await load();

    return entityId;
  }

  /** Replaces one entry in the list with a fresh copy, without reloading all of them. */
  function replaceEntry(updated: Entry): void {
    entries.value = entries.value.map((entry) =>
      entry.entityId === updated.entityId ? updated : entry,
    );
  }

  /** Changes name, icon, area or labels in HA. Errors go to the caller. */
  async function updateEntry({
    entityId,
    changes,
  }: {
    entityId: string;
    changes: EntryChanges;
  }): Promise<void> {
    replaceEntry(await updateEntryRequest({ entityId, changes }));
  }

  /** Runs or switches an entry, then reloads to show the new state. Errors go to the caller. */
  async function runAction({
    entityId,
    action,
  }: {
    entityId: string;
    action: EntryAction;
  }): Promise<void> {
    await runEntryAction({ entityId, action });
    await load();
  }

  /**
   * Saves favorite or note. The list shows the change at once and goes back if saving fails.
   * Errors go to the caller.
   */
  async function updateExtras({
    entityId,
    extras,
  }: {
    entityId: string;
    extras: { isFavorite?: boolean; note?: string | null };
  }): Promise<void> {
    const before = entries.value.find((entry) => entry.entityId === entityId);

    if (!before) return;

    replaceEntry({
      ...before,
      ...extras,
      note: extras.note === undefined ? before.note : extras.note,
    });

    try {
      await updateEntryExtras({ entityId, extras });
    } catch (error) {
      replaceEntry(before);
      throw error;
    }
  }

  /** Creates an empty automation, script or scene; the list reloads so it opens right away. */
  async function createFlow(flow: NewFlow): Promise<string> {
    const entityId = await createFlowRequest(flow);
    await load();

    return entityId;
  }

  /** Deletes a helper, automation or script in HA (each kind has its own endpoint). */
  async function deleteEntry(entry: Entry): Promise<void> {
    const isFlow = entry.kind === "automation" || entry.kind === "script";

    if (isFlow) await deleteFlowRequest(entry.entityId);
    else await deleteHelperRequest(entry.entityId);

    await load();
  }

  return {
    entries,
    isLoading,
    hasLoadError,
    load,
    refresh,
    moveEntry,
    moveEntries,
    moveEach,
    renameCategory,
    createHelper,
    updateEntry,
    runAction,
    updateExtras,
    createFlow,
    deleteEntry,
  };
});
