import { defineStore } from "pinia";
import { computed, ref } from "vue";

import type { HelperSettings } from "@/constants/helpers";
import type { SceneDevice } from "@/services/scenesService";
import type { SceneValue } from "@/utils/sceneValues";

/** What a scene sets per device, in the order of its rows. */
export type SceneEntities = Record<string, SceneValue>;

/**
 * Unsaved edits of one entry. `base` is what HA had when the edits started; when HA's version
 * differs from it later, someone changed the entry meanwhile.
 */
type Draft<T> = { base: T; value: T };

/** A scene's draft also keeps the devices added to it, which HA does not know as members yet. */
type SceneDraft = Draft<SceneEntities> & { added: SceneDevice[] };

/** How the open scene was before its first automatic save, for "Alles rückgängig". */
type SceneUndo = { entityId: string; base: SceneEntities; savedAt: string };

const same = (first: unknown, second: unknown): boolean =>
  JSON.stringify(first) === JSON.stringify(second);

/** A plain copy; the values come from Vue proxies, which structuredClone cannot copy. */
const copy = <T>(value: T): T => JSON.parse(JSON.stringify(value)) as T;

/**
 * Unsaved edits of helper settings and scenes, kept per entry like flow drafts in the editorStore.
 * Their tabs are unmounted when the user opens another tab or entry; the draft waits here, the list
 * shows the dot, and the browser asks before closing.
 */
export const useDraftsStore = defineStore("drafts", () => {
  const helpers = ref<Record<string, Draft<HelperSettings>>>({});
  const scenes = ref<Record<string, SceneDraft>>({});
  const sceneUndo = ref<SceneUndo | null>(null);

  const unsavedIds = computed(
    () => new Set([...Object.keys(helpers.value), ...Object.keys(scenes.value)]),
  );

  /** Keeps the edited settings; edited back to what HA has, nothing is left to save. */
  function keepHelper(entityId: string, saved: HelperSettings, value: HelperSettings): void {
    const rest = { ...helpers.value };
    delete rest[entityId];
    const base = helpers.value[entityId]?.base ?? copy(saved);
    helpers.value = same(value, saved)
      ? rest
      : { ...rest, [entityId]: { base, value: copy(value) } };
  }

  function keepScene(
    entityId: string,
    saved: SceneEntities,
    value: SceneEntities,
    added: SceneDevice[],
  ): void {
    const rest = { ...scenes.value };
    delete rest[entityId];
    const base = scenes.value[entityId]?.base ?? copy(saved);
    scenes.value = same(value, saved)
      ? rest
      : { ...rest, [entityId]: { base, value: copy(value), added: copy(added) } };
  }

  /** The scene is saved (or its edits are thrown away): nothing left to keep. */
  function dropScene(entityId: string): void {
    const rest = { ...scenes.value };
    delete rest[entityId];
    scenes.value = rest;
  }

  /** Notes an automatic save; only the first one since opening the scene keeps how it was. */
  function noteAutoSave(entityId: string, before: SceneEntities, savedAt: string): void {
    const base = sceneUndo.value?.entityId === entityId ? sceneUndo.value.base : copy(before);
    sceneUndo.value = { entityId, base, savedAt };
  }

  /** Another entry was opened: "Alles rückgängig" starts over there. */
  function forgetUndo(entityId?: string): void {
    if (!entityId || sceneUndo.value?.entityId !== entityId) sceneUndo.value = null;
  }

  return {
    helpers,
    scenes,
    sceneUndo,
    unsavedIds,
    keepHelper,
    keepScene,
    dropScene,
    noteAutoSave,
    forgetUndo,
  };
});
