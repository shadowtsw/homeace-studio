import { createPinia, setActivePinia } from "pinia";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createApp } from "vue";
import { createMemoryHistory, createRouter, type Router } from "vue-router";

import { deriveDarkColors } from "@/core/themes/deriveDark";
import { STANDARD_COLORS } from "@/core/themes/themeFormat";
import { useOwnThemesStore } from "@/stores/ownThemesStore";
import { useSettingsWindowStore } from "@/stores/settingsWindowStore";
import { useThemeEditorStore } from "@/stores/themeEditorStore";
import { useThemeStore } from "@/stores/themeStore";
import { BUILT_IN_THEMES, STANDARD_THEME } from "@/utils/themes/builtInThemes";

let router: Router;

function builtIn(id: string) {
  const theme = BUILT_IN_THEMES.find((entry) => entry.id === id);
  if (!theme) throw new Error(`theme ${id} is missing`);
  return theme;
}

// Without a HA user (no backend answer here) own themes live in this browser
describe("themeEditorStore", () => {
  beforeEach(async () => {
    router = createRouter({
      history: createMemoryHistory(),
      routes: [{ path: "/", component: { render: () => null } }],
    });
    const pinia = createPinia();
    createApp({ render: () => null })
      .use(pinia)
      .use(router);
    setActivePinia(pinia);
    await router.replace("/");
    await useSettingsWindowStore().open("appearance");
  });

  it("derives the dark version for a new theme from Standard, keeps a crafted one for a copy", async () => {
    const editor = useThemeEditorStore();

    await editor.open({ kind: "new", theme: STANDARD_THEME, name: "Mein Theme" });
    expect(editor.draft?.isDarkDerived).toBe(true);

    await editor.open({ kind: "new", theme: builtIn("forest"), name: "Wald (Kopie)" });
    expect(editor.draft?.isDarkDerived).toBe(false);
    expect(editor.draft?.ownId).toBeNull();
    expect(editor.draft?.startId).toBe("forest");
  });

  it("takes only #rrggbb, and nothing while the dark version is derived", async () => {
    const editor = useThemeEditorStore();
    await editor.open({ kind: "new", theme: STANDARD_THEME, name: "Mein Theme" });

    editor.setColor({ key: "accent", value: "red" });
    editor.setColor({ key: "accent", value: "#C2552D" });
    expect(editor.draft?.light?.accent).toBe("#c2552d");
    expect(editor.isDirty).toBe(true);

    editor.setEditMode("dark");
    const derivedAccent = editor.editedColors?.accent;
    editor.setColor({ key: "accent", value: "#000000" });
    expect(editor.editedColors?.accent).toBe(derivedAccent);
  });

  it("turning derivation off starts the hand-made dark version from the derived one", async () => {
    const editor = useThemeEditorStore();
    await editor.open({ kind: "new", theme: STANDARD_THEME, name: "Mein Theme" });

    editor.setDarkDerived(false);

    expect(editor.draft?.dark).toEqual(deriveDarkColors(STANDARD_COLORS.light));
    editor.setEditMode("dark");
    editor.setColor({ key: "accent", value: "#ffcc00" });
    expect(editor.editedColors?.accent).toBe("#ffcc00");
  });

  it("saves a new theme as an own one and puts it on", async () => {
    const editor = useThemeEditorStore();
    const ownThemes = useOwnThemesStore();
    const themeStore = useThemeStore();
    await editor.open({ kind: "new", theme: builtIn("sand"), name: "Sand (Kopie)" });

    const saved = await editor.save("Mein Theme");

    expect(saved?.name).toBe("Sand (Kopie)");
    expect(ownThemes.themes.map((theme) => theme.ownName)).toEqual(["Sand (Kopie)"]);
    expect(themeStore.theme.ownName).toBe("Sand (Kopie)");
    expect(editor.draft).toBeNull();
  });

  it("an own theme whose dark version is exactly derived opens with derivation on, and is replaced", async () => {
    const editor = useThemeEditorStore();
    const ownThemes = useOwnThemesStore();
    await editor.open({ kind: "new", theme: STANDARD_THEME, name: "Abendrot" });
    await editor.save("Mein Theme");
    const own = ownThemes.themes[0];
    if (!own) throw new Error("own theme missing");

    await editor.open({ kind: "edit", theme: own });
    expect(editor.draft?.isDarkDerived).toBe(true);
    editor.setName("Abendrot neu");
    await editor.save("Mein Theme");

    expect(ownThemes.themes.map((theme) => [theme.id, theme.ownName])).toEqual([
      [own.id, "Abendrot neu"],
    ]);
  });

  it("drops the draft when the settings window closes", async () => {
    const editor = useThemeEditorStore();
    await editor.open({ kind: "new", theme: STANDARD_THEME, name: "Mein Theme" });

    useSettingsWindowStore().close();

    await vi.waitFor(() => expect(editor.draft).toBeNull());
  });
});
