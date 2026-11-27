import { createPinia, setActivePinia } from "pinia";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { STANDARD_COLORS } from "@/core/themes/themeFormat";
import { useThemeStore } from "@/stores/themeStore";
import type { ThemeDefinition } from "@/utils/themes/builtInThemes";

/** What HA's page shows; null is "not in the panel". */
const haPage = vi.hoisted(() => ({ theme: null as ThemeDefinition | null }));
vi.mock("@/utils/themes/haTheme", async (importOriginal) => {
  const original = await importOriginal<typeof import("@/utils/themes/haTheme")>();
  return { ...original, browserColorParser: () => () => null, readHaTheme: () => haPage.theme };
});

describe("themeStore", () => {
  beforeEach(() => setActivePinia(createPinia()));

  afterEach(() => {
    vi.unstubAllGlobals();
    haPage.theme = null;
  });

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

  it('"Wie mein HA" outside the panel is Standard', () => {
    const themeStore = useThemeStore();
    themeStore.selectTheme("homeAssistant");

    expect(themeStore.haTheme).toBeNull();
    expect(themeStore.theme.id).toBe("standard");
  });

  it('"Wie mein HA" shows the version HA shows, whatever the brightness switch says', () => {
    haPage.theme = {
      id: "homeAssistant",
      light: null,
      dark: STANDARD_COLORS.dark,
      isStrong: false,
      followsHa: true,
      haThemeName: null,
    };
    vi.stubGlobal("document", { documentElement: { style: { setProperty: () => undefined } } });
    const themeStore = useThemeStore();
    themeStore.selectModeChoice("light");
    themeStore.selectTheme("homeAssistant");

    expect(themeStore.theme.id).toBe("homeAssistant");
    expect(themeStore.mode).toBe("dark");
    expect(themeStore.isModeLocked).toBe(true);
  });
});
