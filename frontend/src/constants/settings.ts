/** The tabs of the settings window, in the order they are shown. */
export const SETTINGS_TAB = {
  general: "general",
  editing: "editing",
  tools: "tools",
  ai: "ai",
  about: "about",
} as const;

export type SettingsTab = (typeof SETTINGS_TAB)[keyof typeof SETTINGS_TAB];

export const SETTINGS_TABS: readonly { tab: SettingsTab; icon: string }[] = [
  { tab: SETTINGS_TAB.general, icon: "mdi-tune-variant" },
  { tab: SETTINGS_TAB.editing, icon: "mdi-pencil-outline" },
  { tab: SETTINGS_TAB.tools, icon: "mdi-tools" },
  { tab: SETTINGS_TAB.ai, icon: "mdi-creation" },
  { tab: SETTINGS_TAB.about, icon: "mdi-information-outline" },
];

/** Where users report a bug or suggest an idea. */
export const ISSUES_URL = "https://github.com/shadowtsw/homeace-studio/issues";
