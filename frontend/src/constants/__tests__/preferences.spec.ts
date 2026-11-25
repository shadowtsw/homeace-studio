import { describe, expect, it } from "vitest";

import { PREFERENCE_SCOPE, PREFERENCES } from "../preferences";

const preferenceNamesWithScope = (scope: string): string[] =>
  Object.entries(PREFERENCES)
    .filter(([, preference]) => preference.scope === scope)
    .map(([name]) => name)
    .sort();

describe("PREFERENCES", () => {
  // The rule: what the user sets on purpose follows them; what HomeAce Studio remembers by itself
  // stays on this device. A new preference has to be placed on purpose, so this list must change.
  it("follows the user only for settings changed on purpose", () => {
    expect(preferenceNamesWithScope(PREFERENCE_SCOPE.user)).toEqual([
      "locale",
      "sceneAutoSave",
      "seenVersion",
      "storedTraces",
      "technicalDetails",
    ]);
  });

  it("keeps the look of the columns and the filters on this device", () => {
    expect(preferenceNamesWithScope(PREFERENCE_SCOPE.device)).toEqual([
      "detailFolded",
      "listScopes",
      "navMode",
      "paneWidths",
      "settingsTab",
    ]);
  });

  it("uses one storage key per preference, all starting with homeace.", () => {
    const storageKeys = Object.values(PREFERENCES).map((preference) => preference.storageKey);

    expect(new Set(storageKeys).size).toBe(storageKeys.length);
    expect(storageKeys.every((storageKey) => storageKey.startsWith("homeace."))).toBe(true);
  });
});
