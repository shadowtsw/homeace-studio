import { describe, expect, it } from "vitest";

import { hasUnknownEntry } from "../unknownEntries";

describe("hasUnknownEntry", () => {
  const entities = [{ entityId: "automation.a" }, { entityId: "script.b" }];

  it("is false when the entity list knows every entry", () => {
    const entries = [
      { entityId: "automation.a", isDisabled: false },
      { entityId: "script.b", isDisabled: false },
    ];

    expect(hasUnknownEntry({ entries, entities })).toBe(false);
  });

  it("is true for an entry created after the entity list was loaded", () => {
    const entries = [{ entityId: "input_boolean.new", isDisabled: false }];

    expect(hasUnknownEntry({ entries, entities })).toBe(true);
  });

  it("ignores disabled entries, which never are in the entity list", () => {
    const entries = [{ entityId: "automation.off", isDisabled: true }];

    expect(hasUnknownEntry({ entries, entities })).toBe(false);
  });
});
