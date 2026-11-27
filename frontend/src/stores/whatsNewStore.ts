import { defineStore } from "pinia";
import { computed, ref } from "vue";

import { usePreference } from "@/composables/usePreference";
import { PREFERENCES } from "@/constants/preferences";
import {
  LAST_VERSION_WITHOUT_WHATS_NEW,
  WHATS_NEW,
  type WhatsNewRelease,
} from "@/constants/whatsNew";
import { hadEarlierVisit } from "@/utils/whatsNew/earlierVisit";
import {
  currentRelease,
  effectiveVersion,
  initialSeenVersion,
  unseenReleases,
} from "@/utils/whatsNew/whatsNew";

/**
 * "What's new" after an update: which highlights the user has not confirmed yet, and the popover.
 * The confirmed version follows the user (scope "user"), like the other settings.
 */
export const useWhatsNewStore = defineStore("whatsNew", () => {
  const version = effectiveVersion({ appVersion: __APP_VERSION__, releases: WHATS_NEW });
  const firstSeenVersion = initialSeenVersion({
    hadEarlierVisit: hadEarlierVisit(),
    currentVersion: version,
    lastVersionWithout: LAST_VERSION_WITHOUT_WHATS_NEW,
  });
  const seenVersion = usePreference({
    preference: PREFERENCES.seenVersion,
    defaultValue: firstSeenVersion,
  });
  const isOpen = ref(false);
  /** Opened from the gear menu: the current release only, also when it was confirmed already. */
  const isCurrentOnly = ref(false);

  const unseen = computed(() =>
    unseenReleases({
      releases: WHATS_NEW,
      seenVersion: seenVersion.value,
      currentVersion: version,
    }),
  );
  const hasUnseen = computed(() => unseen.value.length > 0);
  /** Highlights not confirmed yet, over all skipped releases ("2 neu" in the settings). */
  const unseenCount = computed(() =>
    unseen.value.reduce((count, release) => count + release.items.length, 0),
  );
  /** Whether the running version has highlights at all (not yet while developing a release). */
  const hasHighlights = currentRelease({ releases: WHATS_NEW, currentVersion: version }) !== null;
  /** What the popover lists, newest first; skipped releases follow the newest one. */
  const releases = computed<WhatsNewRelease[]>(() => {
    if (!isCurrentOnly.value && unseen.value.length > 0) return unseen.value;
    const current = currentRelease({ releases: WHATS_NEW, currentVersion: version });
    return current ? [current] : [];
  });

  function open(currentOnly = false): void {
    isCurrentOnly.value = currentOnly;
    isOpen.value = true;
  }

  function close(): void {
    isOpen.value = false;
  }

  /** "OK": the highlights up to this version are seen, the gift goes away. */
  function confirm(): void {
    seenVersion.value = version;
    isOpen.value = false;
  }

  return {
    version,
    isOpen,
    hasUnseen,
    unseenCount,
    hasHighlights,
    releases,
    open,
    close,
    confirm,
  };
});
