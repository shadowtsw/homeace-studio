import { describe, expect, it } from "vitest";

import { fillPlaceholders, mdiIconClass } from "../text";

describe("fillPlaceholders", () => {
  it("fills known placeholders and leaves unknown ones as written", () => {
    expect(
      fillPlaceholders({ template: "„{path}“ gibt es schon ({count})", params: { path: "Haus" } }),
    ).toBe("„Haus“ gibt es schon ({count})");
  });
});

describe("mdiIconClass", () => {
  it("maps HA mdi icons to font classes and ignores other icon sets", () => {
    expect(mdiIconClass("mdi:lightbulb-outline")).toBe("mdi-lightbulb-outline");
    expect(mdiIconClass("hass:home")).toBeNull();
    expect(mdiIconClass(null)).toBeNull();
  });
});
