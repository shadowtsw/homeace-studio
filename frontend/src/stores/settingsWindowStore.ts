import { defineStore } from "pinia";
import { computed, ref } from "vue";

import { usePreference } from "@/composables/usePreference";
import { PREFERENCE_SCOPE, PREFERENCES, type PreferenceScope } from "@/constants/preferences";
import {
  GOOD_TO_KNOW_TOPIC,
  SETTINGS_TAB,
  SETTINGS_TABS,
  type GoodToKnowTopic,
  type SettingsTab,
} from "@/constants/settings";
import { usePreferencesStore } from "@/stores/preferencesStore";

/** The settings window the gear opens: whether it is open and which tab it shows. */
export const useSettingsWindowStore = defineStore("settingsWindow", () => {
  const preferences = usePreferencesStore();
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
   * The HA user the settings follow; null when HomeAce Studio was not opened through HA (then
   * everything stays in this browser, and the window says so), undefined before the first answer.
   */
  const detectedHaUser = computed(() => preferences.haUser);
  const hasHaUser = computed(() => Boolean(preferences.haUser));

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

  /** The topic "Gut zu wissen" shows; not kept, it starts at the first one. */
  const goodToKnowTopic = ref<GoodToKnowTopic>(GOOD_TO_KNOW_TOPIC.saving);

  /** "Mehr dazu" next to a setting: the topic that explains it. */
  function showTopic(topic: GoodToKnowTopic): void {
    goodToKnowTopic.value = topic;
    open(SETTINGS_TAB.goodToKnow);
  }

  return {
    isOpen,
    tab,
    hasHaUser,
    detectedHaUser,
    goodToKnowTopic,
    effectiveScope,
    open,
    close,
    selectTab,
    showTopic,
  };
});
