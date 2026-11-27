import { describe, expect, it } from "vitest";

import {
  contrastRatio,
  ensureContrast,
  isHexColor,
  lightnessOf,
  mixColors,
  readableOn,
  withLightness,
} from "@/utils/themes/color";

describe("isHexColor", () => {
  it("takes only #rrggbb", () => {
    expect(isHexColor("#3451d1")).toBe(true);
    expect(isHexColor("#3451D1")).toBe(true);
    expect(isHexColor("#345")).toBe(false);
    expect(isHexColor("red")).toBe(false);
    expect(isHexColor("url(https://example.org/x.png)")).toBe(false);
    expect(isHexColor("#3451d1; background: red")).toBe(false);
    expect(isHexColor(3_428_817)).toBe(false);
  });
});

describe("contrastRatio", () => {
  it("follows WCAG 2", () => {
    expect(contrastRatio("#000000", "#ffffff")).toBeCloseTo(21, 5);
    expect(contrastRatio("#ffffff", "#ffffff")).toBe(1);
    // Standard's text on its background, as checked by hand
    expect(contrastRatio("#161a24", "#eef0f4")).toBeGreaterThan(15);
  });
});

describe("mixColors", () => {
  it("weights the first colour", () => {
    expect(mixColors({ color: "#000000", other: "#ffffff", weight: 0.25 })).toBe("#bfbfbf");
    expect(mixColors({ color: "#3451d1", other: "#ffffff", weight: 1 })).toBe("#3451d1");
  });
});

describe("withLightness", () => {
  it("keeps the hue and changes the lightness", () => {
    const lighter = withLightness({ color: "#3451d1", lightness: 80 });

    expect(lightnessOf(lighter)).toBeCloseTo(80, 0);
    expect(withLightness({ color: "#808080", lightness: 0 })).toBe("#000000");
  });
});

describe("ensureContrast", () => {
  it("keeps a colour that already stands out", () => {
    expect(ensureContrast({ color: "#161a24", background: "#ffffff", minRatio: 2 })).toBe(
      "#161a24",
    );
  });

  it("moves a colour away from its background until it reaches the ratio", () => {
    const onWhite = ensureContrast({ color: "#f0f0ff", background: "#ffffff", minRatio: 3 });
    const onBlack = ensureContrast({ color: "#101018", background: "#000000", minRatio: 3 });

    expect(contrastRatio(onWhite, "#ffffff")).toBeGreaterThanOrEqual(3);
    expect(contrastRatio(onBlack, "#000000")).toBeGreaterThanOrEqual(3);
    expect(lightnessOf(onBlack)).toBeGreaterThan(lightnessOf("#101018"));
  });
});

describe("readableOn", () => {
  it("picks the text colour that reads better", () => {
    const choices = { dark: "#0e1117", light: "#ffffff" };

    expect(readableOn(["#3451d1"], choices)).toBe("#ffffff");
    expect(readableOn(["#ffd400"], choices)).toBe("#0e1117");
  });
});
