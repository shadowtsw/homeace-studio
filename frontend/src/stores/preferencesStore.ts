import { defineStore } from "pinia";
import { ref, watch, type Ref } from "vue";

import { PREFERENCE_SCOPE, type Preference } from "@/constants/preferences";
import {
  fetchPreferences,
  importPreferences,
  savePreference,
  type HaUser,
  type UserPreferences,
} from "@/services/preferencesService";
import { isSameValue, preferenceName, valuesToHandOver } from "@/utils/preferenceSync";

/** A change is sent shortly after the last one, so dragging a choice sends one request. */
const SAVE_DELAY_MS = 400;

type TrackedPreference = { preference: Preference; value: Ref<unknown> };

/**
 * Settings that follow a HA user (scope "user"). The browser keeps a copy, so HomeAce Studio starts
 * with the last values at once; the backend's values win when they arrive. Opened without HA
 * (locally, in the demo), there is no user and everything stays in the browser.
 */
export const usePreferencesStore = defineStore("preferences", () => {
  /** Undefined until the backend answered, null when it was not opened through HA. */
  const haUser = ref<HaUser | null | undefined>(undefined);
  const tracked = new Map<string, TrackedPreference>();
  /** What the backend has for the user; null until known. */
  let serverValues: UserPreferences | null = null;
  const saveTimers = new Map<string, ReturnType<typeof setTimeout>>();

  /** Called by usePreference for every preference; only scope "user" is synced. */
  function track({ preference, value }: { preference: Preference; value: Ref<unknown> }): void {
    if (preference.scope !== PREFERENCE_SCOPE.user) return;

    const name = preferenceName(preference);
    tracked.set(name, { preference, value });
    applyServerValue(name);
    watch(value, (next) => scheduleSave({ name, value: next }), { deep: true });
  }

  function applyServerValue(name: string): void {
    const entry = tracked.get(name);
    if (!serverValues || !entry || !(name in serverValues)) return;

    const serverValue = serverValues[name];
    if (!isSameValue(entry.value.value, serverValue)) entry.value.value = serverValue;
  }

  function scheduleSave({ name, value }: { name: string; value: unknown }): void {
    // Nothing to do without a user, before the first answer, or for a value the backend has
    if (!haUser.value || !serverValues || isSameValue(serverValues[name], value)) return;

    clearTimeout(saveTimers.get(name));
    saveTimers.set(
      name,
      setTimeout(() => void save({ name, value }), SAVE_DELAY_MS),
    );
  }

  async function save({ name, value }: { name: string; value: unknown }): Promise<void> {
    try {
      serverValues = await savePreference({ name, value });
    } catch (error) {
      console.error(`Saving the setting ${name} failed`, error);
    }
  }

  /** The browser's own values, for the first visit and for settings the backend does not know. */
  function keptInBrowser(exceptNames?: ReadonlySet<string>): UserPreferences {
    const kept = [...tracked].map(([name, { preference, value }]) => ({
      name,
      value: value.value,
      isStored: localStorage.getItem(preference.storageKey) !== null,
    }));

    return valuesToHandOver({ kept, exceptNames });
  }

  /** Who is there, and their settings; the first visit through HA hands over this browser's. */
  async function fetchUserValues(): Promise<UserPreferences | null> {
    const answer = await fetchPreferences();
    haUser.value = answer.user;
    if (!answer.user) return null;

    return answer.values ?? (await importPreferences(keptInBrowser()));
  }

  /** Once at start. On failure everything simply stays in this browser. */
  async function load(): Promise<void> {
    // Who is there, and what the backend keeps for them
    try {
      serverValues = await fetchUserValues();
    } catch (error) {
      console.error("Loading the settings per user failed", error);
      haUser.value = null;
      return;
    }
    if (!serverValues) return;

    // The backend's values win; settings it does not know yet get this browser's value
    for (const name of tracked.keys()) applyServerValue(name);
    const missing = keptInBrowser(new Set(Object.keys(serverValues)));
    for (const [name, value] of Object.entries(missing)) void save({ name, value });
  }

  return { haUser, track, load };
});
