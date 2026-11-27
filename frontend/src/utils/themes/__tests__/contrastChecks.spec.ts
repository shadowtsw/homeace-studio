import { describe, expect, it } from "vitest";

import { contrastRatio } from "@/core/themes/color";
import { STANDARD_COLORS } from "@/core/themes/themeFormat";
import { contrastChecks, withSuggestion } from "@/utils/themes/contrastChecks";

describe("contrastChecks", () => {
  it("finds Standard readable everywhere", () => {
    const levels = contrastChecks(STANDARD_COLORS.light).map((check) => check.level);

    expect(levels).toEqual(["good", "good", "good"]);
  });

  it("tells weak from unreadable", () => {
    const greyText = { ...STANDARD_COLORS.light, text: "#8a8a8a" };
    const invisibleText = { ...STANDARD_COLORS.light, text: "#f0f1f4" };

    expect(contrastChecks(greyText)[1]?.level).toBe("weak");
    expect(contrastChecks(invisibleText)[0]?.level).toBe("unreadable");
  });
});

describe("withSuggestion", () => {
  it("moves the text until it reads well on page and surfaces alike", () => {
    const colors = { ...STANDARD_COLORS.light, text: "#c0c4cc" };
    const check = contrastChecks(colors).find((entry) => entry.id === "textOnSurface");
    if (!check) throw new Error("check missing");

    const fixed = withSuggestion({ colors, check });

    expect(contrastRatio(fixed.text, fixed.surface)).toBeGreaterThanOrEqual(4.5);
    expect(contrastRatio(fixed.text, fixed.background)).toBeGreaterThanOrEqual(4.5);
    expect(fixed.accent).toBe(colors.accent);
  });

  it("moves only the accent for the accent check", () => {
    const colors = { ...STANDARD_COLORS.light, accent: "#d8dcf8" };
    const check = contrastChecks(colors).find((entry) => entry.id === "accentOnSurface");
    if (!check) throw new Error("check missing");

    const fixed = withSuggestion({ colors, check });

    expect(contrastRatio(fixed.accent, fixed.surface)).toBeGreaterThanOrEqual(3);
    expect(fixed.text).toBe(colors.text);
  });
});
