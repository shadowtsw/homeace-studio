import { computed, onBeforeUnmount, reactive, watch, type Ref } from "vue";
import { useI18n } from "vue-i18n";

import { fetchSceneDevice, saveScene } from "@/services/scenesService";
import { useMessagesStore } from "@/stores/messagesStore";
import { useToastStore } from "@/stores/toastStore";
import { useVersionsStore } from "@/stores/versionsStore";
import type { Entry } from "@/types/entry";
import type { SceneValue } from "@/utils/sceneValues";

import { useSceneAutoSave } from "./useSceneAutoSave";
import { useSceneDraft } from "./useSceneDraft";
import { useSceneEntityDrop } from "./useSceneEntityDrop";
import { useScenePreview } from "./useScenePreview";

/**
 * Everything the scene editor does: the draft, the preview on the devices, automatic saving,
 * devices dropped from the list, and the edits. Editing switches nothing, unless a preview or
 * "Ausprobieren" runs. Switching scenes or leaving saves waiting edits and puts devices back.
 */
export function useSceneEditor({ entry }: { entry: Ref<Entry> }) {
  const { t } = useI18n();
  const toasts = useToastStore();
  const messages = useMessagesStore();
  const versions = useVersionsStore();
  const scene = useSceneDraft({ sceneId: () => entry.value.entityId });

  function fail(error: unknown): void {
    toasts.show({
      text: messages.textFor({ error, fallback: t("errors.actionFailed") }),
      tone: "error",
    });
  }

  // reactive(): the template reads isPreviewing and isAutoSave without .value.
  const preview = reactive(
    useScenePreview({
      sceneId: () => entry.value.entityId,
      entities: scene.entities,
      nameOf: (id) => scene.deviceOf(id).name,
      fail,
    }),
  );
  const autoSave = reactive(
    useSceneAutoSave({
      loadedId: scene.loadedId,
      saved: scene.saved,
      isDirty: scene.isDirty,
      isSaving: scene.isSaving,
      isEditable: () => scene.view.value?.isEditable === true,
      entities: scene.entities,
      applySaved: scene.applySaved,
      show: scene.show,
      onUndone: () => {
        preview.showAgain();
        toasts.show({ text: t("scene.toast.undoneAll", { name: entry.value.name }) });
      },
      fail,
    }),
  );

  // Dragging an entity from the list onto the device list
  const entityDrop = useSceneEntityDrop({
    isEditable: computed(() => scene.view.value?.isEditable === true),
    deviceIds: scene.order,
    add,
  });

  const isFooterShown = computed(() => {
    const isReady =
      scene.view.value?.isEditable === true && !scene.hasError.value && !scene.isLoading.value;
    const hasStatus = autoSave.isAutoSave && autoSave.undo !== null;

    return isReady && (scene.isDirty.value || hasStatus);
  });

  scene.keepEditsInDrafts();

  // ---- editing (switches nothing, unless a preview or "Ausprobieren" runs) -------------------

  function change({ id, value }: { id: string; value: SceneValue }): void {
    scene.setValue({ id, value });
    preview.showLive(id);
  }

  /** Takes everything the device has right now, also what the editor has no control for. */
  function takeCurrent(id: string): void {
    const current = scene.deviceOf(id).current;
    if (!current) return;

    change({ id, value: { state: current.state, ...current.attributes } });
    toasts.show({ text: t("scene.toast.taken", { name: scene.deviceOf(id).name }) });
  }

  async function remove(id: string): Promise<void> {
    await preview.restoreDevice(id);
    scene.removeDevice(id);
  }

  async function add(id: string): Promise<void> {
    if (scene.order.value.includes(id)) return;

    try {
      const device = await fetchSceneDevice(id);
      scene.addDevice({ id, device });
      change({ id, value: device.values ?? { state: "on" } });
      toasts.show({ text: t("scene.toast.added", { name: device.name }) });
    } catch (error) {
      fail(error);
    }
  }

  // ---- saving -------------------------------------------------------------------------------

  async function save(): Promise<void> {
    const entityId = scene.loadedId.value;
    if (!entityId) return;

    const sent = scene.entities();
    scene.isSaving.value = true;

    try {
      const result = await saveScene({ entityId, entities: sent });
      scene.applySaved({ result, sent });
      void versions.noteSaved(entityId);
      toasts.show({ text: t("scene.toast.saved", { name: entry.value.name }) });
      autoSave.reset();
    } catch (error) {
      fail(error);
    } finally {
      scene.isSaving.value = false;
    }
  }

  function discard(): void {
    scene.resetToSaved();
    preview.showAgain();
  }

  // ---- switching scenes and leaving: waiting edits are saved, devices go back ----------------

  watch(
    () => entry.value.entityId,
    (entityId, previous) => {
      autoSave.flush();
      if (previous) preview.leave(previous);
      autoSave.reset();
      scene.loadedId.value = null;
      void scene.load();
    },
    { immediate: true },
  );

  onBeforeUnmount(() => {
    autoSave.flush();
    preview.leave(entry.value.entityId);
  });

  return {
    ...scene,
    preview,
    autoSave,
    entityDrop,
    isFooterShown,
    change,
    takeCurrent,
    remove,
    add,
    save,
    discard,
  };
}
