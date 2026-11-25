import { describe, expect, it } from "vitest";

import { freeLabelColor, labelColorCss } from "../labelColors";

describe("label colours", () => {
  it("knows HA's colour names, hex values and the theme names", () => {
    expect(labelColorCss("indigo")).toBe("#3f51b5");
    expect(labelColorCss("light-blue")).toBe("#03a9f4");
    expect(labelColorCss("#123abc")).toBe("#123abc");
    expect(labelColorCss("primary")).toBe("#03a9f4");
  });

  it("has no colour for none or an unknown name", () => {
    expect(labelColorCss(null)).toBeNull();
    expect(labelColorCss("sparkle")).toBeNull();
  });

  it("gives a new label a colour no label has yet", () => {
    expect(freeLabelColor(["red", "pink"])).toBe("purple");
    expect(freeLabelColor([])).toBe("red");
  });
});
