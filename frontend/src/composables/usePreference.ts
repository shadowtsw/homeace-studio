import { useLocalStorage, type RemovableRef } from "@vueuse/core";
import type { MaybeRefOrGetter, Ref } from "vue";

import type { Preference } from "@/constants/preferences";
import { usePreferencesStore } from "@/stores/preferencesStore";

export type UsePreferenceOptions<T> = {
  /** The entry from PREFERENCES: storage key and scope. */
  preference: Preference;
  defaultValue: MaybeRefOrGetter<T>;
  /** Objects: fill keys missing in the stored value from the default (e.g. a new pane). */
  isMergingDefaults?: boolean;
  /** False: keep the default out of storage until the user changes it. */
  isWritingDefaults?: boolean;
};

/**
 * A kept preference as a ref. Every preference goes through here, so where it applies is decided
 * in one place (PREFERENCES).
 *
 * The browser always keeps it. Scope "user" is also synced with the backend for the HA user who
 * opened HomeAce Studio (preferences store); callers do not notice. Call it in a store's setup.
 */
export function usePreference<T>({
  preference,
  defaultValue,
  isMergingDefaults = false,
  isWritingDefaults = true,
}: UsePreferenceOptions<T>): RemovableRef<T> {
  const value = useLocalStorage(preference.storageKey, defaultValue, {
    mergeDefaults: isMergingDefaults,
    writeDefaults: isWritingDefaults,
  });
  usePreferencesStore().track({ preference, value: value as Ref<unknown> });

  return value;
}
