import { computed, reactive, ref, toRaw, watch } from "vue";

import { fetchScene, type SceneDevice, type SceneView } from "@/services/scenesService";
import { useDraftsStore, type SceneEntities } from "@/stores/draftsStore";
import { domainOf, type SceneValue } from "@/utils/sceneValues";

const same = (first: unknown, second: unknown): boolean =>
  JSON.stringify(first) === JSON.stringify(second);

const valuesOf = (result: SceneView): SceneEntities =>
  Object.fromEntries(result.devices.map((d) => [d.entityId, d.values ?? {}]));

/**
 * What a scene sets, as HA has it saved (`saved`) and as the user edits it (`draft`); `order`
 * keeps the rows. Edits are kept in the drafts store, so they survive switching tabs and entries.
 */
export function useSceneDraft({ sceneId }: { sceneId: () => string }) {
  const drafts = useDraftsStore();

  const view = ref<SceneView | null>(null);
  const devices = reactive(new Map<string, SceneDevice>());
  const saved = ref<SceneEntities>({});
  const draft = ref<SceneEntities>({});
  const order = ref<string[]>([]);
  const isLoading = ref(false);
  const hasError = ref(false);
  const isSaving = ref(false);
  /** The scene the shown values belong to; null while another one loads. */
  const loadedId = ref<string | null>(null);

  const entities = (): SceneEntities =>
    Object.fromEntries(order.value.map((id) => [id, draft.value[id] ?? {}]));
  const isDirty = computed(() => !same(entities(), saved.value));
  /** HA has other values than when the edits started. */
  const hasRemoteChange = computed(() => {
    const kept = loadedId.value ? drafts.scenes[loadedId.value] : undefined;

    return kept !== undefined && !same(kept.base, saved.value);
  });
  /** Devices added in the editor that HA does not have in the scene yet. */
  const addedDevices = (): SceneDevice[] =>
    order.value.filter((id) => !(id in saved.value)).map(deviceOf);

  function deviceOf(id: string): SceneDevice {
    return (
      devices.get(id) ?? {
        entityId: id,
        name: id,
        domain: domainOf(id),
        values: null,
        current: null,
      }
    );
  }

  async function load(): Promise<void> {
    const entityId = sceneId();
    isLoading.value = true;
    hasError.value = false;

    try {
      const result = await fetchScene(entityId);
      if (entityId !== sceneId()) return;
      show(result);
    } catch {
      hasError.value = true;
    } finally {
      isLoading.value = false;
    }
  }

  /** Shows a scene as HA has it, or with the edits kept from before switching tabs or entries. */
  function show(result: SceneView): void {
    // Devices from HA plus the ones added in a kept draft
    const kept = drafts.scenes[result.entityId];
    view.value = result;
    devices.clear();
    for (const device of [...result.devices, ...(kept?.added ?? [])]) {
      devices.set(device.entityId, device);
    }

    // Values: the kept draft wins over what HA has
    saved.value = valuesOf(result);
    // toRaw: Vue wraps refs in proxies, which structuredClone cannot copy.
    draft.value = structuredClone(toRaw(kept?.value ?? saved.value));
    order.value = Object.keys(draft.value);
    loadedId.value = result.entityId;
  }

  /**
   * Takes over what HA saved. Edits made while saving stay as a draft (automatic saving sends them
   * next); if another scene was opened meanwhile, only its kept draft is done.
   */
  function applySaved({ result, sent }: { result: SceneView; sent: SceneEntities }): void {
    // Nothing edited since sending: the kept draft is done, also for a scene no longer open
    const entityId = result.entityId;
    const kept = drafts.scenes[entityId];
    const isDone = !kept || same(kept.value, sent);
    const isStillOpen = loadedId.value === entityId;

    if (isDone) drafts.dropScene(entityId);
    if (!isStillOpen) return;
    if (isDone) {
      show(result);
      return;
    }

    // Edited further: take HA's answer, keep the newer edits on top
    view.value = result;
    for (const device of result.devices) devices.set(device.entityId, device);
    saved.value = valuesOf(result);

    // Restart the draft from what was just saved, so it is not taken for a change in HA
    drafts.dropScene(entityId);
    drafts.keepScene({ entityId, saved: saved.value, value: entities(), added: addedDevices() });
  }

  /**
   * Every edit goes into the drafts store. Called by the editor after its automatic saving is set
   * up, so both watchers run in the same order as always.
   */
  function keepEditsInDrafts(): void {
    watch(
      [draft, order],
      () => {
        if (!loadedId.value || !view.value?.isEditable) return;

        drafts.keepScene({
          entityId: loadedId.value,
          saved: saved.value,
          value: entities(),
          added: addedDevices(),
        });
      },
      { deep: true },
    );
  }

  function setValue({ id, value }: { id: string; value: SceneValue }): void {
    draft.value = { ...draft.value, [id]: value };
  }

  function removeDevice(id: string): void {
    const next = { ...draft.value };
    delete next[id];
    draft.value = next;
    order.value = order.value.filter((item) => item !== id);
  }

  function addDevice({ id, device }: { id: string; device: SceneDevice }): void {
    devices.set(id, device);
    order.value = [...order.value, id];
  }

  /** Back to what HA has saved. */
  function resetToSaved(): void {
    // toRaw: Vue wraps refs in proxies, which structuredClone cannot copy.
    draft.value = structuredClone(toRaw(saved.value));
    order.value = Object.keys(saved.value);
  }

  return {
    view,
    saved,
    draft,
    order,
    isLoading,
    hasError,
    isSaving,
    loadedId,
    entities,
    isDirty,
    hasRemoteChange,
    deviceOf,
    load,
    show,
    applySaved,
    keepEditsInDrafts,
    setValue,
    removeDevice,
    addDevice,
    resetToSaved,
  };
}
