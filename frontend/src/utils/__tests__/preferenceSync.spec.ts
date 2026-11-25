import { describe, expect, it } from "vitest";

import { PREFERENCES } from "@/constants/preferences";

import { isSameValue, preferenceName, valuesToHandOver } from "../preferenceSync";

describe("preferenceSync", () => {
  it("names a preference without the storage prefix", () => {
    expect(preferenceName(PREFERENCES.technicalDetails)).toBe("technicalDetails");
    expect(preferenceName({ storageKey: "other", scope: "user" })).toBe("other");
  });

  it("hands over only values the browser stored, and not those the backend has", () => {
    const kept = [
      { name: "technicalDetails", value: true, isStored: true },
      { name: "locale", value: "de", isStored: false },
      { name: "storedTraces", value: 20, isStored: true },
    ];

    expect(valuesToHandOver(kept)).toEqual({ technicalDetails: true, storedTraces: 20 });
    expect(valuesToHandOver(kept, new Set(["storedTraces"]))).toEqual({ technicalDetails: true });
  });

  it("compares plain values", () => {
    expect(isSameValue(true, true)).toBe(true);
    expect(isSameValue(20, "20")).toBe(false);
  });
});
