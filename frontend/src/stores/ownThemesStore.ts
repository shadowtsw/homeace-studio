import { defineStore } from "pinia";
import { computed, watch } from "vue";

import { usePreference } from "@/composables/usePreference";
import { PREFERENCES } from "@/constants/preferences";
import {
  MAX_OWN_THEMES,
  isOwnThemeId,
  newOwnThemeId,
  ownThemeRecord,
  readOwnThemes,
  uniqueThemeName,
  type OwnTheme,
} from "@/core/themes/ownThemes";
import { themeFileValue, type CheckedTheme } from "@/core/themes/themeFormat";
import { createOwnTheme, deleteOwnTheme, fetchOwnThemes } from "@/services/themesService";
import { usePreferencesStore } from "@/stores/preferencesStore";
import { isRecord } from "@/utils/record";
import { ownThemeDefinition } from "@/utils/themes/builtInThemes";

/** What adding a theme gives back: its id and the name it got (a taken name gets " (2)"). */
export type AddedTheme = { id: string; name: string };

/**
 * Themes the user made or imported. With a HA user they live in the backend per user; without one
 * (direct port, demo) in this browser. The browser always keeps a copy, so they show at once on the
 * next start. Whatever comes from storage or the backend is checked again like a file.
 */
export const useOwnThemesStore = defineStore("ownThemes", () => {
  const preferences = usePreferencesStore();
  const storedCopy = usePreference<unknown>({
    preference: PREFERENCES.ownThemes,
    defaultValue: [],
  });

  const ownThemes = computed<OwnTheme[]>(() => readOwnThemes(storedCopy.value));
  /** As the app shows and applies them. */
  const themes = computed(() => ownThemes.value.map(ownThemeDefinition));
  const isFull = computed(() => ownThemes.value.length >= MAX_OWN_THEMES);
  const hasHaUser = computed(() => Boolean(preferences.haUser));

  function keepList(answer: unknown): void {
    storedCopy.value = readOwnThemes(answer).map(ownThemeRecord);
  }

  /** The backend's list wins over this browser's copy, as with the settings. */
  async function load(): Promise<void> {
    if (!hasHaUser.value) return;

    keepList(await fetchOwnThemes());
  }

  watch(
    () => preferences.haUser,
    (user) => {
      if (!user) return;
      void load().catch((error: unknown) => console.error("Loading the own themes failed", error));
    },
    { immediate: true },
  );

  /**
   * Adds a checked theme. A name another own theme has gets " (2)"; nothing is ever overwritten.
   *
   * @returns The new theme's id and name.
   */
  async function add(theme: CheckedTheme): Promise<AddedTheme> {
    // A name no other own theme has
    const takenNames = ownThemes.value.map((ownTheme) => ownTheme.theme.name);
    const name = uniqueThemeName({ name: theme.name, takenNames });
    const named: CheckedTheme = { ...theme, name };

    // Without a HA user: only in this browser
    if (!hasHaUser.value) {
      const added: OwnTheme = { id: newOwnThemeId(), theme: named };
      storedCopy.value = [...ownThemes.value, added].map(ownThemeRecord);
      return { id: added.id, name };
    }

    // With one: the backend checks again, gives the id and the whole list
    const answer = await createOwnTheme(themeFileValue(named));
    const id = isRecord(answer) ? answer.id : null;
    if (!isOwnThemeId(id)) throw new Error("The backend answered without a theme id");

    keepList(isRecord(answer) ? answer.themes : []);
    const stored = ownThemes.value.find((ownTheme) => ownTheme.id === id);
    return { id, name: stored?.theme.name ?? name };
  }

  async function remove(id: string): Promise<void> {
    if (!hasHaUser.value) {
      storedCopy.value = ownThemes.value
        .filter((ownTheme) => ownTheme.id !== id)
        .map(ownThemeRecord);
      return;
    }

    keepList(await deleteOwnTheme(id));
  }

  return { themes, ownThemes, isFull, hasHaUser, load, add, remove };
});
