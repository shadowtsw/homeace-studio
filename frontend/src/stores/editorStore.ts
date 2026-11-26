import { defineStore } from "pinia";
import { computed, ref } from "vue";

import { fetchCatalog, fetchFlow, saveFlow } from "@/services/editorService";
import type { EditorCatalog, Flow, FlowChange } from "@/types/editor";
import { applyFlowChange } from "@/utils/flow/flowChanges";

type Config = Record<string, unknown>;

/**
 * Unsaved edits of one flow. `base` is the config the edits started from; when HA's config
 * differs from it later, someone changed the flow meanwhile.
 */
type Draft = { base: Config; config: Config };

const sameConfig = (first: Config, second: Config): boolean =>
  JSON.stringify(first) === JSON.stringify(second);

/**
 * The block catalog per language, the flow of the open automation or script, and unsaved edits.
 * Edits are kept per entry, so switching to another entry and back loses nothing.
 */
export const useEditorStore = defineStore("editor", () => {
  const catalogs = ref<Record<string, EditorCatalog>>({});
  const flow = ref<Flow | null>(null);
  const isFlowLoading = ref(false);
  const hasFlowError = ref(false);
  const drafts = ref<Record<string, Draft>>({});
  const isSaving = ref(false);

  const openDraft = computed(() => (flow.value ? drafts.value[flow.value.entityId] : undefined));
  /** The open flow with its unsaved edits; what the flow view shows. */
  const editedFlow = computed((): Flow | null => {
    if (!flow.value) return null;

    return openDraft.value ? { ...flow.value, config: openDraft.value.config } : flow.value;
  });
  const isDirty = computed(() => openDraft.value !== undefined);
  const hasRemoteChange = computed(() => {
    const draft = openDraft.value;

    return draft !== undefined && flow.value !== null && !sameConfig(draft.base, flow.value.config);
  });
  /** Entries with unsaved edits, for the dot in the list. */
  const unsavedIds = computed(() => new Set(Object.keys(drafts.value)));

  /** Loads the catalog of a language once; without it, blocks show their technical keys. */
  async function loadCatalog(language: string): Promise<void> {
    if (catalogs.value[language]) return;

    try {
      catalogs.value = { ...catalogs.value, [language]: await fetchCatalog(language) };
    } catch (error) {
      console.error("Loading the editor catalog failed", error);
    }
  }

  async function loadFlow(entityId: string): Promise<void> {
    isFlowLoading.value = true;
    hasFlowError.value = false;

    try {
      const loaded = await fetchFlow(entityId);
      // Another entry may have been opened while this one was loading.
      if (loaded.entityId === entityId) flow.value = loaded;
    } catch (error) {
      hasFlowError.value = true;
      flow.value = null;
      console.error("Loading the flow failed", error);
    } finally {
      isFlowLoading.value = false;
    }
  }

  /**
   * Reloads the open flow quietly, e.g. after a live change in HA. Unsaved edits stay; if HA's
   * version changed, `hasRemoteChange` tells the user.
   */
  async function refreshFlow(): Promise<void> {
    const entityId = flow.value?.entityId;

    if (!entityId) return;

    try {
      const loaded = await fetchFlow(entityId);
      if (flow.value?.entityId === entityId) flow.value = loaded;
    } catch (error) {
      console.error("Refreshing the flow failed", error);
    }
  }

  function clearFlow(): void {
    flow.value = null;
    hasFlowError.value = false;
  }

  /**
   * Applies one change to the open flow: a value, or adding, moving, duplicating, disabling or
   * removing a block. Only the draft changes; HA sees nothing until {@link save}.
   */
  function applyChange(change: FlowChange): void {
    const current = flow.value;

    if (!current) return;

    const draft = drafts.value[current.entityId];
    const base = draft?.base ?? current.config;
    const config = applyFlowChange({ config: draft?.config ?? current.config, change });

    // Edited back to how it was: nothing left to save.
    if (sameConfig(config, base)) {
      discard();
      return;
    }

    drafts.value = { ...drafts.value, [current.entityId]: { base, config } };
  }

  /** Throws away the edits of the open flow. */
  function discard(): void {
    if (flow.value) removeDraft(flow.value.entityId);
  }

  function removeDraft(entityId: string): void {
    const rest = { ...drafts.value };
    delete rest[entityId];
    drafts.value = rest;
  }

  /** Saves the edits of the open flow in HA. @throws ApiError when HA rejects the config. */
  async function save(): Promise<void> {
    const entityId = flow.value?.entityId;
    const draft = openDraft.value;

    if (!entityId || !draft) return;

    isSaving.value = true;

    try {
      const saved = await saveFlow(entityId, draft.config);
      // The user may have opened another entry meanwhile; only this entry's draft is done.
      removeDraft(entityId);
      if (flow.value?.entityId === entityId) flow.value = saved;
    } finally {
      isSaving.value = false;
    }
  }

  return {
    catalogs,
    flow,
    editedFlow,
    isFlowLoading,
    hasFlowError,
    isDirty,
    isSaving,
    hasRemoteChange,
    unsavedIds,
    loadCatalog,
    loadFlow,
    refreshFlow,
    clearFlow,
    applyChange,
    discard,
    save,
  };
});
