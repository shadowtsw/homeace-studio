import { useLocalStorage, type RemovableRef } from "@vueuse/core";
import type { MaybeRefOrGetter } from "vue";

import type { Preference } from "@/constants/preferences";

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
 * For now both scopes live in this browser. With settings per HA user, the "user" scope also goes
 * to the backend; callers do not change.
 */
export function usePreference<T>({
  preference,
  defaultValue,
  isMergingDefaults = false,
  isWritingDefaults = true,
}: UsePreferenceOptions<T>): RemovableRef<T> {
  return useLocalStorage(preference.storageKey, defaultValue, {
    mergeDefaults: isMergingDefaults,
    writeDefaults: isWritingDefaults,
  });
}
