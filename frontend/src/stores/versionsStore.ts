import { defineStore } from "pinia";
import { ref } from "vue";

import {
  closeOpenVersion,
  fetchVersions,
  nameVersion,
  restoreVersion,
  type RestoredVersions,
  type VersionsView,
} from "@/services/versionsService";

/**
 * Versions of the open automation, script or scene ("Git light"). Reloaded when the entry changes
 * and after every save, so the list and the footer note always show the open version.
 */
export const useVersionsStore = defineStore("versions", () => {
  const current = ref<VersionsView | null>(null);
  const isLoading = ref(false);
  const hasError = ref(false);
  /** The entry HomeAce Studio saved last; the footer says which version the save went into. */
  const lastSavedEntityId = ref<string | null>(null);
  /** The entry the next answer is for; answers for an older one are dropped. */
  let wanted: string | null = null;

  async function load(entityId: string | null): Promise<void> {
    wanted = entityId;
    if (!entityId) {
      current.value = null;
      return;
    }
    if (current.value?.ref.entityId !== entityId) current.value = null;
    isLoading.value = true;
    hasError.value = false;

    try {
      const view = await fetchVersions(entityId);
      if (wanted === entityId) current.value = view;
    } catch (error) {
      console.error("Loading the versions failed", error);
      if (wanted === entityId) hasError.value = true;
    } finally {
      if (wanted === entityId) isLoading.value = false;
    }
  }

  /** After a save in HomeAce Studio: reload, and let the footer tell which version it joined. */
  async function noteSaved(entityId: string): Promise<void> {
    lastSavedEntityId.value = entityId;
    await load(entityId);
  }

  function keep(view: VersionsView): void {
    if (wanted === view.ref.entityId) current.value = view;
  }

  async function name(options: { versionId: string; name: string | null }): Promise<void> {
    if (!wanted) return;
    keep(await nameVersion({ entityId: wanted, ...options }));
  }

  async function closeOpen(): Promise<void> {
    if (!wanted) return;
    keep(await closeOpenVersion(wanted));
  }

  /** Brings a version back; the answer lists entity IDs that were replaced by their new ones. */
  async function restore(versionId: string): Promise<RestoredVersions | null> {
    if (!wanted) return null;
    const restored = await restoreVersion({ entityId: wanted, versionId });
    keep(restored);
    lastSavedEntityId.value = null;
    return restored;
  }

  return {
    current,
    isLoading,
    hasError,
    lastSavedEntityId,
    load,
    noteSaved,
    name,
    closeOpen,
    restore,
  };
});
