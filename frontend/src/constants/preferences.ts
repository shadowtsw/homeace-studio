/**
 * Where a kept preference applies. What the user sets on purpose follows them to every device
 * ("user": later stored per HA user in the overlay); what HomeAce Studio remembers by itself stays on
 * this device ("device": pane widths differ per screen). The settings window shows the scope next to
 * every setting.
 */
export const PREFERENCE_SCOPE = {
  user: "user",
  device: "device",
} as const;

export type PreferenceScope = (typeof PREFERENCE_SCOPE)[keyof typeof PREFERENCE_SCOPE];

export type Preference = {
  /** Key in the browser's storage; everything of HomeAce Studio starts with "homeace.". */
  storageKey: string;
  scope: PreferenceScope;
};

/**
 * Every preference HomeAce Studio keeps, with its scope. A new one is added here first, so its
 * scope is decided once and the settings window can show it.
 */
export const PREFERENCES = {
  locale: { storageKey: "homeace.locale", scope: PREFERENCE_SCOPE.user },
  technicalDetails: { storageKey: "homeace.technicalDetails", scope: PREFERENCE_SCOPE.user },
  /** Label chips under each name in the list. */
  listLabels: { storageKey: "homeace.listLabels", scope: PREFERENCE_SCOPE.user },
  sceneAutoSave: { storageKey: "homeace.sceneAutoSave", scope: PREFERENCE_SCOPE.user },
  /** How many runs new automations and scripts keep. */
  storedTraces: { storageKey: "homeace.storedTraces", scope: PREFERENCE_SCOPE.user },
  /** The version whose "What's new" highlights the user confirmed with "OK". */
  seenVersion: { storageKey: "homeace.seenVersion", scope: PREFERENCE_SCOPE.user },
  paneWidths: { storageKey: "homeace.paneWidths", scope: PREFERENCE_SCOPE.device },
  detailFolded: { storageKey: "homeace.detailFolded", scope: PREFERENCE_SCOPE.device },
  navMode: { storageKey: "homeace.navMode", scope: PREFERENCE_SCOPE.device },
  listScopes: { storageKey: "homeace.scopes", scope: PREFERENCE_SCOPE.device },
  /** The tab the settings window opened last. */
  settingsTab: { storageKey: "homeace.settingsTab", scope: PREFERENCE_SCOPE.device },
} as const satisfies Record<string, Preference>;
