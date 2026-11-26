import { describe, expect, it } from "vitest";

import { entryFormChanges, isFormEdited, type EntryFormValues } from "@/utils/entryForm";

/** What the form was filled with. */
const base: EntryFormValues = {
  name: "Flurlicht",
  icon: "",
  areaId: "flur",
  labelIds: ["licht"],
};

describe("entryFormChanges", () => {
  it("sends only the name when a label came from elsewhere meanwhile", () => {
    const form = { ...base, name: "Flurlicht nachts" };

    const changes = entryFormChanges({ form, base, currentLabelIds: ["licht", "nacht"] });

    expect(changes).toEqual({ name: "Flurlicht nachts" });
  });

  it("keeps an area set elsewhere when only the icon changed", () => {
    const form = { ...base, icon: "mdi:lamp" };

    const changes = entryFormChanges({ form, base, currentLabelIds: ["licht"] });

    expect(changes).toEqual({ icon: "mdi:lamp" });
  });

  it("applies a ticked label to the labels the entry has now", () => {
    const form = { ...base, labelIds: ["licht", "flur"] };

    const changes = entryFormChanges({ form, base, currentLabelIds: ["licht", "nacht"] });

    expect(changes).toEqual({ labelIds: ["licht", "nacht", "flur"] });
  });

  it("takes away only the label the user unticked", () => {
    const form = { ...base, labelIds: [] };

    const changes = entryFormChanges({ form, base, currentLabelIds: ["licht", "nacht"] });

    expect(changes).toEqual({ labelIds: ["nacht"] });
  });

  it("sends nothing when nothing was changed in the form", () => {
    expect(entryFormChanges({ form: base, base, currentLabelIds: ["licht", "nacht"] })).toEqual({});
  });
});

describe("isFormEdited", () => {
  it("ignores spaces around the name and the order of labels", () => {
    const form = { ...base, name: " Flurlicht ", labelIds: ["licht"] };

    expect(isFormEdited(form, base)).toBe(false);
  });

  it("sees a removed area", () => {
    expect(isFormEdited({ ...base, areaId: null }, base)).toBe(true);
  });
});
