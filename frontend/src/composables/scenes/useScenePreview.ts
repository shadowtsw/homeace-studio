import { useEventListener } from "@vueuse/core";
import { reactive, ref } from "vue";
import { useI18n } from "vue-i18n";

import { previewScene, restoreScene, restoreSceneOnLeave } from "@/services/scenesService";
import type { SceneEntities } from "@/stores/draftsStore";
import { useToastStore } from "@/stores/toastStore";

/** Live edits during a preview wait this long, so a dragged slider does not flood HA. */
const PREVIEW_DELAY_MS = 250;

type ScenePreviewOptions = {
  /** The scene shown right now. */
  sceneId: () => string;
  /** What the scene sets now, in row order. */
  entities: () => SceneEntities;
  nameOf: (deviceId: string) => string;
  fail: (error: unknown) => void;
};

/**
 * "Vorschau" (the whole scene) and "Ausprobieren" (one device) switch the devices on purpose. The
 * backend keeps how they were; leaving the scene or closing the page puts them back.
 */
export function useScenePreview({ sceneId, entities, nameOf, fail }: ScenePreviewOptions) {
  const { t } = useI18n();
  const toasts = useToastStore();

  const isPreviewing = ref(false);
  /** Devices shown on their own with "Ausprobieren". */
  const trying = reactive(new Set<string>());
  const pending = new Map<string, ReturnType<typeof setTimeout>>();

  const isShown = (deviceId: string): boolean => isPreviewing.value || trying.has(deviceId);
  const isShowingAny = (): boolean => isPreviewing.value || trying.size > 0;
  const valueOf = (deviceId: string): SceneEntities => ({
    [deviceId]: entities()[deviceId] ?? {},
  });

  /** An edit of a device that is shown right now goes to HA after a short wait. */
  function showLive(deviceId: string): void {
    if (!isShown(deviceId)) return;

    clearTimeout(pending.get(deviceId));
    pending.set(
      deviceId,
      setTimeout(() => {
        pending.delete(deviceId);
        previewScene({ entityId: sceneId(), entities: valueOf(deviceId) }).catch(fail);
      }, PREVIEW_DELAY_MS),
    );
  }

  async function togglePreview(): Promise<void> {
    try {
      if (isPreviewing.value) {
        await restoreScene({ entityId: sceneId() });
        isPreviewing.value = false;
        trying.clear();
        toasts.show({ text: t("scene.toast.restored") });
      } else {
        const shown = entities();
        await previewScene({ entityId: sceneId(), entities: shown });
        isPreviewing.value = true;
        trying.clear();
        toasts.show({ text: t("scene.toast.previewOn", Object.keys(shown).length) });
      }
    } catch (error) {
      fail(error);
    }
  }

  async function tryDevice(deviceId: string): Promise<void> {
    const name = nameOf(deviceId);

    try {
      if (trying.has(deviceId)) {
        await restoreScene({ entityId: sceneId(), entityIds: [deviceId] });
        trying.delete(deviceId);
        toasts.show({ text: t("scene.toast.triedBack", { name }) });
      } else {
        await previewScene({ entityId: sceneId(), entities: valueOf(deviceId) });
        trying.add(deviceId);
        toasts.show({ text: t("scene.toast.tried", { name }) });
      }
    } catch (error) {
      fail(error);
    }
  }

  /** A device leaves the scene: if it is shown, it goes back to how it was. */
  async function restoreDevice(deviceId: string): Promise<void> {
    if (!isShown(deviceId)) return;

    await restoreScene({ entityId: sceneId(), entityIds: [deviceId] }).catch(fail);
    trying.delete(deviceId);
  }

  /** The values changed as a whole (discarded, undone): a running preview shows them. */
  function showAgain(): void {
    if (isPreviewing.value) previewScene({ entityId: sceneId(), entities: entities() }).catch(fail);
  }

  /** Leaving the scene: the devices go back to how they were. */
  function leave(leftSceneId: string): void {
    if (!isShowingAny()) return;

    isPreviewing.value = false;
    trying.clear();
    restoreScene({ entityId: leftSceneId })
      .then(() => toasts.show({ text: t("scene.toast.restored") }))
      .catch(fail);
  }

  // A normal request would be cancelled when the page closes; sendBeacon still gets through.
  useEventListener(window, "pagehide", () => {
    if (isShowingAny()) restoreSceneOnLeave(sceneId());
  });

  return {
    isPreviewing,
    trying,
    showLive,
    togglePreview,
    tryDevice,
    restoreDevice,
    showAgain,
    leave,
  };
}
