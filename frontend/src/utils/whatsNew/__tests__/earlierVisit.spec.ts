import { describe, expect, it } from "vitest";

import { hasOwnKeys } from "@/utils/whatsNew/earlierVisit";

describe("hasOwnKeys", () => {
  it("finds keys of HomeAce Studio", () => {
    expect(
      hasOwnKeys({ keys: ["other", "homeace.paneWidths"], ignoredKey: "homeace.seenVersion" }),
    ).toBe(true);
  });

  it("ignores other apps and the given key", () => {
    expect(
      hasOwnKeys({ keys: ["other", "homeace.seenVersion"], ignoredKey: "homeace.seenVersion" }),
    ).toBe(false);
    expect(hasOwnKeys({ keys: [], ignoredKey: "homeace.seenVersion" })).toBe(false);
  });
});
