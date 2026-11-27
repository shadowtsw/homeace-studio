import { createPinia, setActivePinia } from "pinia";
import { beforeEach, describe, expect, it } from "vitest";

import { STANDARD_COLORS, type CheckedTheme } from "@/core/themes/themeFormat";
import { useOwnThemesStore } from "@/stores/ownThemesStore";
import { useThemeStore } from "@/stores/themeStore";

const ABENDROT: CheckedTheme = {
  name: "Abendrot",
  author: "Sabine",
  light: STANDARD_COLORS.light,
  dark: STANDARD_COLORS.dark,
  isStrong: false,
  fineTokens: { light: {}, dark: {} },
};

// Without a HA user (no backend answer here) own themes live in this browser
describe("ownThemesStore without a HA user", () => {
  beforeEach(() => setActivePinia(createPinia()));

  it("adds a theme under a name nothing else has", async () => {
    const ownThemes = useOwnThemesStore();

    const first = await ownThemes.add(ABENDROT);
    const second = await ownThemes.add(ABENDROT);

    expect(first.name).toBe("Abendrot");
    expect(second.name).toBe("Abendrot (2)");
    expect(ownThemes.themes.map((theme) => theme.ownName)).toEqual(["Abendrot", "Abendrot (2)"]);
  });

  it("shows an own theme once chosen, and Standard after it is deleted", async () => {
    const ownThemes = useOwnThemesStore();
    const themeStore = useThemeStore();
    const { id } = await ownThemes.add(ABENDROT);

    themeStore.selectTheme(id);
    expect(themeStore.theme.ownName).toBe("Abendrot");

    await ownThemes.remove(id);
    expect(ownThemes.themes).toEqual([]);
    expect(themeStore.theme.id).toBe("standard");
  });
});
