import { describe, expect, it } from "vitest";

import { contrastRatio, lightnessOf } from "../color";
import { deriveDarkColors } from "../deriveDark";
import {
  MAX_OWN_THEMES,
  isOwnThemeId,
  newOwnThemeId,
  ownThemeRecord,
  readOwnThemes,
  uniqueThemeName,
  type OwnTheme,
} from "../ownThemes";
import { STANDARD_COLORS, themeFileName } from "../themeFormat";

const OWN: OwnTheme = {
  id: "own-0123456789ab",
  theme: {
    name: "Abendrot",
    author: null,
    light: STANDARD_COLORS.light,
    dark: STANDARD_COLORS.dark,
    isStrong: false,
    fineTokens: { light: {}, dark: {} },
  },
};

describe("own themes", () => {
  it("get ids of their own form", () => {
    const id = newOwnThemeId();

    expect(isOwnThemeId(id)).toBe(true);
    expect(newOwnThemeId()).not.toBe(id);
    expect(isOwnThemeId("standard")).toBe(false);
    expect(isOwnThemeId("own-<script>")).toBe(false);
  });

  it("never overwrite a name", () => {
    expect(uniqueThemeName({ name: "Abendrot", takenNames: [] })).toBe("Abendrot");
    expect(uniqueThemeName({ name: "Abendrot", takenNames: ["Abendrot"] })).toBe("Abendrot (2)");
    expect(
      uniqueThemeName({
        name: "Abendrot",
        takenNames: ["Abendrot", "Abendrot (2)"],
      }),
    ).toBe("Abendrot (3)");
  });

  it("are read back from storage and checked again", () => {
    const stored = [
      ownThemeRecord(OWN),
      { ...ownThemeRecord(OWN), id: "own-0123456789ab" },
      { ...ownThemeRecord(OWN), id: "evil" },
      { id: "own-aaaaaaaaaaaa", "homeace-theme": 1, name: "Nur Name" },
      "nonsense",
    ];

    expect(readOwnThemes(stored)).toEqual([OWN]);
    expect(readOwnThemes({ not: "a list" })).toEqual([]);
  });

  it("are kept to MAX_OWN_THEMES", () => {
    const many = Array.from({ length: MAX_OWN_THEMES + 5 }, (_, index) =>
      ownThemeRecord({ ...OWN, id: `own-${String(index).padStart(12, "0")}` }),
    );

    expect(readOwnThemes(many)).toHaveLength(MAX_OWN_THEMES);
  });
});

describe("deriveDarkColors", () => {
  it("makes a dark page with light text in the light theme's hues", () => {
    const dark = deriveDarkColors(STANDARD_COLORS.light);

    expect(lightnessOf(dark.background)).toBeLessThan(15);
    expect(lightnessOf(dark.text)).toBeGreaterThan(85);
    expect(contrastRatio(dark.text, dark.surface)).toBeGreaterThan(10);
    expect(lightnessOf(dark.accent)).toBeGreaterThanOrEqual(65);
  });
});

describe("themeFileName", () => {
  it("keeps letters and digits", () => {
    expect(themeFileName("Abend/rot!")).toBe("Abendrot.homeace-theme.json");
    expect(themeFileName("Закат 2")).toBe("Закат 2.homeace-theme.json");
    expect(themeFileName("../..")).toBe("Theme.homeace-theme.json");
  });
});
