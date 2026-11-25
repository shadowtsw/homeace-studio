import { apiFetch, apiPost, apiSend } from "./api";

/** The Home Assistant user who opened HomeAce Studio. */
export type HaUser = { id: string; name: string };

/** Name → value, e.g. { locale: "de", technicalDetails: true }. */
export type UserPreferences = Record<string, unknown>;

export type PreferencesAnswer = {
  /** Null when HomeAce Studio was not opened through HA's sidebar (locally, in the demo). */
  user: HaUser | null;
  /** The user's kept settings; null on the first visit through HA (nothing kept yet). */
  values: UserPreferences | null;
};

export function fetchPreferences(): Promise<PreferencesAnswer> {
  return apiFetch<PreferencesAnswer>("/preferences");
}

/** First visit: this browser's values become the user's, unless another device came first. */
export function importPreferences(values: UserPreferences): Promise<UserPreferences> {
  return apiPost<UserPreferences>("/preferences/import", { values });
}

export function savePreference(name: string, value: unknown): Promise<UserPreferences> {
  return apiSend<UserPreferences>("PUT", `/preferences/${encodeURIComponent(name)}`, { value });
}
