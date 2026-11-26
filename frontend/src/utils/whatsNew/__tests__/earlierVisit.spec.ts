import { describe, expect, it } from "vitest";

import { hasOwnKeys } from "@/utils/whatsNew/earlierVisit";

describe("hasOwnKeys", () => {
  it("finds keys of HomeAce Studio", () => {
    expect(hasOwnKeys(["other", "homeace.paneWidths"], "homeace.seenVersion")).toBe(true);
  });

  it("ignores other apps and the given key", () => {
    expect(hasOwnKeys(["other", "homeace.seenVersion"], "homeace.seenVersion")).toBe(false);
    expect(hasOwnKeys([], "homeace.seenVersion")).toBe(false);
  });
});
