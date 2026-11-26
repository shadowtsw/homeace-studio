import { computed, ref, watch, type Ref } from "vue";
import { useI18n } from "vue-i18n";

import { saveScene, type SceneView } from "@/services/scenesService";
import { useDraftsStore, type SceneEntities } from "@/stores/draftsStore";
import { useSettingsStore } from "@/stores/settingsStore";

/** With automatic saving on, a scene is saved this long after the last edit. */
const AUTO_SAVE_DELAY_MS = 1000;

type SceneAutoSaveOptions = {
  /** The scene the shown values belong to; null while another one loads. */
  loadedId: Ref<string | null>;
  /** What HA has saved, and whether the editor differs from it. */
  saved: Ref<SceneEntities>;
  isDirty: Readonly<Ref<boolean>>;
  /** Shared with saving by hand, so two saves never run at once. */
  isSaving: Ref<boolean>;
  isEditable: () => boolean;
  /** What the scene sets now, in row order. */
  entities: () => SceneEntities;
  /** Takes over what HA saved; edits made meanwhile stay. */
  applySaved: (options: { result: SceneView; sent: SceneEntities }) => void;
  /** Shows the scene as HA has it now. */
  show: (result: SceneView) => void;
  /** After "Alles rückgängig": e.g. a running preview shows the old state, and a toast. */
  onUndone: () => void;
  fail: (error: unknown) => void;
};

/**
 * "Szenen automatisch speichern" (gear menu, off by default): saves ~1 s after the last edit,
 * without a toast; the footer tells the state. "Alles rückgängig" goes back to how the scene was
 * before its first automatic save, also in HA.
 */
export function useSceneAutoSave(options: SceneAutoSaveOptions) {
  const { loadedId, saved, isDirty, isSaving, isEditable, entities } = options;
  const { applySaved, show, onUndone, fail } = options;
  const { locale } = useI18n();
  const drafts = useDraftsStore();
  const settings = useSettingsStore();

  /** A failed automatic save falls back to the normal footer, so the edits are not left hanging. */
  const hasFailed = ref(false);
  const isAutoSave = computed(() => settings.isSceneAutoSave && !hasFailed.value);
  /** "Alles rückgängig" of this scene: how it was before its first automatic save. */
  const undo = computed(() =>
    drafts.sceneUndo && drafts.sceneUndo.entityId === loadedId.value ? drafts.sceneUndo : null,
  );
  let timer: ReturnType<typeof setTimeout> | undefined;

  function schedule(): void {
    clearTimeout(timer);
    timer = setTimeout(() => void autoSave(), AUTO_SAVE_DELAY_MS);
  }

  function cancel(): void {
    clearTimeout(timer);
    timer = undefined;
  }

  async function autoSave(): Promise<void> {
    // Nothing to save, or a save still running: try again later
    timer = undefined;
    const entityId = loadedId.value;
    if (!entityId || !isDirty.value) return;
    if (isSaving.value) {
      schedule();
      return;
    }

    // Save what the scene sets now, remember how it was for "Alles rückgängig"
    const sent = entities();
    const before = saved.value;
    isSaving.value = true;

    try {
      const result = await saveScene(entityId, sent);
      const savedAt = new Date().toLocaleTimeString(locale.value, {
        hour: "2-digit",
        minute: "2-digit",
      });
      drafts.noteAutoSave({ entityId, before, savedAt });
      applySaved({ result, sent });
    } catch (error) {
      hasFailed.value = true;
      fail(error);
    } finally {
      isSaving.value = false;
    }

    // Edited further while saving: those edits follow
    const hasNewerEdits = isAutoSave.value && isDirty.value && loadedId.value === entityId;
    if (hasNewerEdits) schedule();
  }

  /** Leaving with an edit still waiting: it is saved right away. */
  function flush(): void {
    if (timer === undefined) return;

    cancel();
    void autoSave();
  }

  /** Another scene opens: a failed save there does not count here. */
  function reset(): void {
    hasFailed.value = false;
  }

  /** Back to how the scene was when it was opened, however many saves there were. */
  async function undoAll(): Promise<void> {
    const entityId = loadedId.value;
    const base = undo.value?.base;
    if (!entityId || !base) return;

    // A waiting automatic save would undo the undo
    cancel();
    isSaving.value = true;

    try {
      // Save the old state in HA, start over without draft and undo
      const result = await saveScene(entityId, base);
      drafts.dropScene(entityId);
      drafts.forgetUndo();
      show(result);
      onUndone();
    } catch (error) {
      fail(error);
    } finally {
      isSaving.value = false;
    }
  }

  // Every edit (or switching the setting on) starts the wait again.
  watch([isAutoSave, () => JSON.stringify(entities())], () => {
    const shouldSave = isAutoSave.value && isDirty.value && isEditable();

    if (shouldSave) schedule();
    else cancel();
  });

  return { isAutoSave, undo, flush, reset, undoAll };
}
