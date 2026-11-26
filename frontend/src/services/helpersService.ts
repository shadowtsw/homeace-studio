import type { HelperSettings, HelperType } from "@/constants/helpers";

import { apiFetch, apiPost, apiSend } from "./api";

export type NewHelper = {
  type: HelperType;
  name: string;
  icon?: string;
  /** Folder to sort the helper into right away; null for none. */
  categoryPath: string | null;
  settings: HelperSettings;
};

/** @returns The entity ID of the new helper, e.g. "input_boolean.gaestemodus". */
export async function createHelper(helper: NewHelper): Promise<string> {
  const result = await apiPost<{ entityId: string }>({ path: "/helpers", body: helper });

  return result.entityId;
}

/** The settings of a storage helper, as the form shows them. */
export type HelperSettingsView = { type: HelperType; settings: HelperSettings };

const settingsPath = (entityId: string): string =>
  `/helpers/${encodeURIComponent(entityId)}/settings`;

/** Reads the settings of a storage helper (input_*, counter, timer). */
export function fetchHelperSettings(entityId: string): Promise<HelperSettingsView> {
  return apiFetch<HelperSettingsView>({ path: settingsPath(entityId) });
}

export type SaveHelperSettingsOptions = {
  entityId: string;
  settings: HelperSettings;
};

/** Saves the settings; @returns them as HA now has them. */
export function saveHelperSettings({
  entityId,
  settings,
}: SaveHelperSettingsOptions): Promise<HelperSettingsView> {
  return apiSend<HelperSettingsView>({
    method: "PUT",
    path: settingsPath(entityId),
    body: { settings },
  });
}

/** Deletes a helper in HA (storage helpers only). */
export async function deleteHelper(entityId: string): Promise<void> {
  await apiFetch<null>({
    path: `/helpers/${encodeURIComponent(entityId)}`,
    options: { method: "DELETE" },
  });
}
