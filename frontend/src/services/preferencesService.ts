import { apiFetch } from "./api";

/** The Home Assistant user who opened HomeAce Studio. */
export type HaUser = { id: string; name: string };

export type PreferencesAnswer = {
  /** Null when HomeAce Studio was not opened through HA's sidebar (locally, in the demo). */
  user: HaUser | null;
};

export function fetchPreferences(): Promise<PreferencesAnswer> {
  return apiFetch<PreferencesAnswer>("/preferences");
}
