import { useMediaQuery } from "@vueuse/core";
import { defineStore } from "pinia";
import { computed, ref } from "vue";
import { useRouter } from "vue-router";

import { usePreference } from "@/composables/usePreference";
import { PREFERENCE_SCOPE, PREFERENCES, type PreferenceScope } from "@/constants/preferences";
import {
  GOOD_TO_KNOW_TOPIC,
  SETTINGS_LIST_MEDIA_QUERY,
  SETTINGS_TAB,
  type GoodToKnowTopic,
  type SettingsTab,
} from "@/constants/settings";
import { usePreferencesStore } from "@/stores/preferencesStore";
import {
  isSameEntry,
  isSettingsTab,
  parentPlace,
  placeChain,
  settingsEntryFromQuery,
  settingsQuery,
  type SettingsEntry,
  type SettingsPlace,
} from "@/utils/settingsPlace";

/**
 * Going back past the first history entry does nothing and sends no event; after this long the
 * window stops waiting for one.
 */
const HISTORY_WAIT_MS = 1000;

/**
 * The settings window the gear opens. Wide screens show tabs; phones, and screens where the tabs do
 * not fit in one row, show the list of sections and one page at a time. Every step is an entry in
 * the browser history (utils/settingsPlace.ts), so the back gesture goes exactly one step.
 */
export const useSettingsWindowStore = defineStore("settingsWindow", () => {
  // Provided by the app, like in a component (Pinia runs setup stores in the app's context)
  const router = useRouter();
  const preferences = usePreferencesStore();

  // Layout: list → page on narrow screens and whenever the tabs do not fit in one row
  const isNarrow = useMediaQuery(SETTINGS_LIST_MEDIA_QUERY);
  /** Measured by the window for the current language; kept for the next opening. */
  const doTabsOverflow = ref(false);
  const isListLayout = computed(() => isNarrow.value || doTabsOverflow.value);

  // Where the window stands: read from the route, so the browser's back and forward move it too
  const entry = computed(() => settingsEntryFromQuery(router.currentRoute.value.query));
  const isOpen = computed(() => entry.value !== null);
  /** List layout: the open page; null shows the list of sections. */
  const section = computed(() => entry.value?.section ?? null);
  /** List layout: the open topic of "Gut zu wissen"; null shows the list of topics. */
  const topic = computed(() => entry.value?.topic ?? null);

  /** Tab layout: opens on the tab used last, on this device. */
  const storedTab = usePreference<SettingsTab>({
    preference: PREFERENCES.settingsTab,
    defaultValue: SETTINGS_TAB.general,
  });
  const tab = computed<SettingsTab>(() => {
    if (entry.value?.section) return entry.value.section;

    return isSettingsTab(storedTab.value) ? storedTab.value : SETTINGS_TAB.general;
  });
  /** Tab layout: the topic "Gut zu wissen" shows; not kept, it starts at the first one. */
  const goodToKnowTopic = ref<GoodToKnowTopic>(GOOD_TO_KNOW_TOPIC.columns);

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

  // History steps: one navigation at a time, each waits for the steps of the one before
  let pendingNavigation = Promise.resolve();

  function navigate(task: () => Promise<void>): Promise<void> {
    pendingNavigation = pendingNavigation
      .then(task)
      .catch((error: unknown) => console.error("Moving in the settings window failed", error));

    return pendingNavigation;
  }

  async function pushEntry(next: SettingsEntry): Promise<void> {
    const query = settingsQuery({ query: router.currentRoute.value.query, entry: next });
    await router.push({ query });
  }

  async function replaceEntry(next: SettingsEntry | null): Promise<void> {
    if (next && isSameEntry(entry.value, next)) return;

    const query = settingsQuery({ query: router.currentRoute.value.query, entry: next });
    await router.replace({ query });
  }

  function goBack(count: number): Promise<void> {
    return new Promise((resolve) => {
      const timeout = setTimeout(finish, HISTORY_WAIT_MS);
      const stopListening = router.afterEach(finish);

      function finish(): void {
        clearTimeout(timeout);
        stopListening();
        resolve();
      }

      router.go(-count);
    });
  }

  /** Tab layout: one history entry for the whole window; another tab replaces it. */
  async function goToTab(place: SettingsPlace): Promise<void> {
    if (place.section) storedTab.value = place.section;

    const current = entry.value;
    if (!current) {
      await pushEntry({ section: place.section, topic: null, step: 1 });
      return;
    }

    const shownSection = place.section ?? current.section;
    await replaceEntry({ section: shownSection, topic: null, step: current.step });
  }

  /**
   * List layout: start → section → topic, one history entry per step. A jump (e.g. "Mehr dazu")
   * first goes back to where its chain branches off, so "‹" always leads to the parent.
   */
  async function goToPage(place: SettingsPlace): Promise<void> {
    // Back to where the chain to the new place branches off
    const chain = placeChain(place);
    const currentStep = entry.value?.step ?? 0;
    const branchStep = Math.min(currentStep, chain.length);
    if (currentStep > branchStep) await goBack(currentStep - branchStep);

    // The entry there becomes the chain's place, the rest of the chain follows
    const branchPlace = chain[branchStep - 1];
    if (branchPlace) await replaceEntry({ ...branchPlace, step: branchStep });

    const missingPlaces = chain.slice(branchStep);
    for (const [offset, missingPlace] of missingPlaces.entries()) {
      await pushEntry({ ...missingPlace, step: branchStep + offset + 1 });
    }
  }

  function goTo(place: SettingsPlace): Promise<void> {
    return navigate(() => (isListLayout.value ? goToPage(place) : goToTab(place)));
  }

  /**
   * @param nextSection - Opens this section at once (on a phone with the list behind it, so "‹"
   *   leads there). Without it: the list on a phone, the tab used last on wide screens.
   * @returns Done when the window shows it.
   */
  function open(nextSection?: SettingsTab): Promise<void> {
    return goTo({ section: nextSection ?? null, topic: null });
  }

  function selectTab(nextTab: SettingsTab): void {
    void goTo({ section: nextTab, topic: null });
  }

  /** "Mehr dazu" next to a setting, or a topic in the list: the topic that explains it. */
  function showTopic(nextTopic: GoodToKnowTopic): void {
    goodToKnowTopic.value = nextTopic;
    void goTo({ section: SETTINGS_TAB.goodToKnow, topic: nextTopic });
  }

  /** "‹": one step up. An entry with nothing of the window before it is replaced instead. */
  function back(): void {
    void navigate(async () => {
      const current = entry.value;
      const parent = current ? parentPlace(current) : null;
      if (!current || !parent) return;

      if (current.step > 1) {
        await goBack(1);
        return;
      }
      await replaceEntry({ ...parent, step: 1 });
    });
  }

  /** Closes the whole window and takes its entries out of the history. */
  function close(): void {
    void navigate(async () => {
      if (entry.value) await goBack(entry.value.step);
    });
  }

  /** Called by the window whenever it measured its tabs (size, language, fonts). */
  function reportTabsOverflow(isOverflowing: boolean): void {
    doTabsOverflow.value = isOverflowing;
  }

  /**
   * An address with the window open (a reload, a typed link) starts closed: how many of the
   * history's entries belong to the window is unknown there.
   */
  async function closeLeftoverEntry(): Promise<void> {
    await router.isReady();
    if (entry.value) await replaceEntry(null);
  }
  void navigate(closeLeftoverEntry);

  return {
    isOpen,
    isListLayout,
    section,
    topic,
    tab,
    goodToKnowTopic,
    hasHaUser,
    detectedHaUser,
    effectiveScope,
    open,
    close,
    back,
    selectTab,
    showTopic,
    reportTabsOverflow,
  };
});
