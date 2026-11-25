import { createPinia, setActivePinia } from "pinia";
import { beforeEach, describe, expect, it } from "vitest";

import type { HelperSettings } from "@/constants/helpers";
import type { SceneDevice } from "@/services/scenesService";
import { useDraftsStore } from "@/stores/draftsStore";

const HELPER = "input_number.target";
const SCENE = "scene.evening";
const OTHER_SCENE = "scene.morning";

const lamp: SceneDevice = {
  entityId: "light.lamp",
  name: "Lamp",
  domain: "light",
  values: null,
  current: null,
};

describe("draftsStore", () => {
  beforeEach(() => setActivePinia(createPinia()));

  it("keeps edited helper settings until they match HA again", () => {
    const drafts = useDraftsStore();
    const saved = { name: "Target", min: 0 } as HelperSettings;

    drafts.keepHelper(HELPER, saved, { ...saved, min: 5 });
    expect(drafts.unsavedIds.has(HELPER)).toBe(true);

    drafts.keepHelper(HELPER, saved, { ...saved });
    expect(drafts.unsavedIds.has(HELPER)).toBe(false);
  });

  it("keeps the base from when the edits started", () => {
    const drafts = useDraftsStore();
    const first = { name: "Target", min: 0 } as HelperSettings;
    const changedInHa = { name: "Target", min: 1 } as HelperSettings;

    drafts.keepHelper(HELPER, first, { ...first, min: 5 });
    drafts.keepHelper(HELPER, changedInHa, { ...first, min: 6 });

    expect(drafts.helpers[HELPER]).toEqual({ base: first, value: { ...first, min: 6 } });
  });

  it("keeps a scene's added devices and drops the draft after saving", () => {
    const drafts = useDraftsStore();
    const saved = { "light.sofa": { state: "on" } };
    const edited = { ...saved, "light.lamp": { state: "on" } };

    drafts.keepScene(SCENE, saved, edited, [lamp]);
    expect(drafts.scenes[SCENE]).toEqual({ base: saved, value: edited, added: [lamp] });

    drafts.dropScene(SCENE);
    expect(drafts.unsavedIds.size).toBe(0);
  });

  it("does not share the values it keeps with the editor", () => {
    const drafts = useDraftsStore();
    const edited = { "light.sofa": { state: "off" } };

    drafts.keepScene(SCENE, { "light.sofa": { state: "on" } }, edited, []);
    edited["light.sofa"].state = "on";

    expect(drafts.scenes[SCENE]?.value).toEqual({ "light.sofa": { state: "off" } });
  });

  it("undoes back to the state before the first automatic save", () => {
    const drafts = useDraftsStore();
    const opened = { "light.sofa": { state: "on" } };

    drafts.noteAutoSave(SCENE, opened, "14:25");
    drafts.noteAutoSave(SCENE, { "light.sofa": { state: "off" } }, "14:26");

    expect(drafts.sceneUndo).toEqual({ entityId: SCENE, base: opened, savedAt: "14:26" });
  });

  it("forgets the undo state when another entry opens, not when the same one does", () => {
    const drafts = useDraftsStore();
    drafts.noteAutoSave(SCENE, {}, "14:25");

    drafts.forgetUndo(SCENE);
    expect(drafts.sceneUndo).not.toBeNull();

    drafts.forgetUndo(OTHER_SCENE);
    expect(drafts.sceneUndo).toBeNull();
  });
});
