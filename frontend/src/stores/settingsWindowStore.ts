import { defineStore } from "pinia";
import { computed, ref } from "vue";

import { usePreference } from "@/composables/usePreference";
import { PREFERENCE_SCOPE, PREFERENCES, type PreferenceScope } from "@/constants/preferences";
import { SETTINGS_TAB, SETTINGS_TABS, type SettingsTab } from "@/constants/settings";

/** The settings window the gear opens: whether it is open and which tab it shows. */
export const useSettingsWindowStore = defineStore("settingsWindow", () => {
  const isOpen = ref(false);
  /** Opens on the tab used last, on this device. */
  const storedTab = usePreference<SettingsTab>({
    preference: PREFERENCES.settingsTab,
    defaultValue: SETTINGS_TAB.general,
  });
  const tab = computed<SettingsTab>(() => {
    const isKnownTab = SETTINGS_TABS.some((entry) => entry.tab === storedTab.value);
    return isKnownTab ? storedTab.value : SETTINGS_TAB.general;
  });

  /**
   * Whether the settings follow a HA user. Not yet: until the backend keeps them per HA user,
   * everything stays in this browser, and the window says so.
   */
  const hasHaUser = ref(false);

  /** Where a preference applies right now: without a HA user, everything is on this device. */
  function effectiveScope(scope: PreferenceScope): PreferenceScope {
    return hasHaUser.value ? scope : PREFERENCE_SCOPE.device;
  }

  /** @param nextTab - Opens this tab instead of the one used last. */
  function open(nextTab?: SettingsTab): void {
    if (nextTab) storedTab.value = nextTab;
    isOpen.value = true;
  }

  function close(): void {
    isOpen.value = false;
  }

  function selectTab(nextTab: SettingsTab): void {
    storedTab.value = nextTab;
  }

  return { isOpen, tab, hasHaUser, effectiveScope, open, close, selectTab };
});
