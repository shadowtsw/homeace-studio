import { EMPTY_OVERLAY, type Overlay } from "../overlay/overlay.model";
import { applyExtras, removeExtras, withExtras } from "./entry-extras";
import type { Entry } from "./entry.model";

const overlay: Overlay = {
  ...EMPTY_OVERLAY,
  favorites: ["script.gute_nacht"],
  notes: { "script.gute_nacht": "Vor dem Schlafen" },
};

function entry(entityId: string): Entry {
  return {
    entityId,
    kind: "script",
    domain: "script",
    name: entityId,
    icon: null,
    categoryId: null,
    categoryPath: null,
    labels: [],
    area: null,
    state: "off",
    isDisabled: false,
    isHidden: false,
    isInRegistry: true,
    isFavorite: false,
    note: null,
  };
}

describe("entry extras", () => {
  it("adds favorite and note from the overlay", () => {
    const [withNote, plain] = withExtras({
      entries: [entry("script.gute_nacht"), entry("script.alles_aus")],
      overlay,
    });

    expect(withNote).toMatchObject({ isFavorite: true, note: "Vor dem Schlafen" });
    expect(plain).toMatchObject({ isFavorite: false, note: null });
  });

  it("changes only the given fields and drops blank notes", () => {
    const unfavored = applyExtras({
      overlay,
      entityId: "script.gute_nacht",
      extras: { isFavorite: false },
    });
    const noteCleared = applyExtras({
      overlay,
      entityId: "script.gute_nacht",
      extras: { note: "  " },
    });
    const added = applyExtras({
      overlay: EMPTY_OVERLAY,
      entityId: "scene.kino",
      extras: { isFavorite: true, note: " Popcorn " },
    });

    expect(unfavored.favorites).toEqual([]);
    expect(unfavored.notes).toEqual(overlay.notes);
    expect(noteCleared.favorites).toEqual(["script.gute_nacht"]);
    expect(noteCleared.notes).toEqual({});
    expect(added).toMatchObject({ favorites: ["scene.kino"], notes: { "scene.kino": "Popcorn" } });
  });

  it("removes everything of a deleted entity", () => {
    expect(removeExtras({ overlay, entityId: "script.gute_nacht" })).toMatchObject({
      favorites: [],
      notes: {},
    });
  });
});
