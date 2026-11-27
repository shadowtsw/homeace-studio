import { createPinia, setActivePinia } from "pinia";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { useThemeStore } from "@/stores/themeStore";

describe("themeStore", () => {
  beforeEach(() => setActivePinia(createPinia()));

  afterEach(() => vi.unstubAllGlobals());

  it("starts with Standard, as the system says", () => {
    const themeStore = useThemeStore();

    expect(themeStore.theme.id).toBe("standard");
    expect(themeStore.modeChoice).toBe("system");
    expect(themeStore.mode).toBe("light");
    expect(themeStore.isModeLocked).toBe(false);
  });

  it("follows a fixed brightness", () => {
    const themeStore = useThemeStore();
    themeStore.selectModeChoice("dark");

    expect(themeStore.mode).toBe("dark");
  });

  it("a theme with one version locks the brightness and shows that version", () => {
    const themeStore = useThemeStore();
    themeStore.selectModeChoice("light");
    themeStore.selectTheme("midnight");

    expect(themeStore.mode).toBe("dark");
    expect(themeStore.isModeLocked).toBe(true);
  });

  it("an unknown theme (another device's newer one, a typo) is Standard", () => {
    const themeStore = useThemeStore();
    themeStore.selectTheme("nope");

    expect(themeStore.theme.id).toBe("standard");
  });

  it("?theme=standard in the address wins until the user picks a theme", () => {
    vi.stubGlobal("window", { location: { search: "?theme=standard" } });
    const themeStore = useThemeStore();
    expect(themeStore.theme.id).toBe("standard");

    themeStore.selectTheme("sand");
    expect(themeStore.theme.id).toBe("sand");
  });

  it("draws other themes in the version they would show now", () => {
    const themeStore = useThemeStore();
    themeStore.selectModeChoice("dark");
    const preview = themeStore.previewTokens(themeStore.theme);

    expect(preview["--bg"]).toBe("#0e1117");
  });
});
