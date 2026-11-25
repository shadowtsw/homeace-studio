/** The tabs of the settings window, in the order they are shown. */
export const SETTINGS_TAB = {
  general: "general",
  editing: "editing",
  tools: "tools",
  ai: "ai",
  goodToKnow: "goodToKnow",
  about: "about",
} as const;

export type SettingsTab = (typeof SETTINGS_TAB)[keyof typeof SETTINGS_TAB];

export const SETTINGS_TABS: readonly { tab: SettingsTab; icon: string }[] = [
  { tab: SETTINGS_TAB.general, icon: "mdi-tune-variant" },
  { tab: SETTINGS_TAB.editing, icon: "mdi-pencil-outline" },
  { tab: SETTINGS_TAB.tools, icon: "mdi-tools" },
  { tab: SETTINGS_TAB.ai, icon: "mdi-creation" },
  { tab: SETTINGS_TAB.goodToKnow, icon: "mdi-lightbulb-outline" },
  { tab: SETTINGS_TAB.about, icon: "mdi-information-outline" },
];

/** Where users report a bug or suggest an idea. */
export const ISSUES_URL = "https://github.com/shadowtsw/homeace-studio/issues";

/**
 * Topics of "Gut zu wissen". They explain how HomeAce Studio behaves, never how it is built. Every
 * feature with a quirk brings its topic, in all five languages (settings.goodToKnow.<topic>).
 */
export const GOOD_TO_KNOW_TOPIC = {
  saving: "saving",
  scenes: "scenes",
  folders: "folders",
  unknownBlocks: "unknownBlocks",
  changedInHa: "changedInHa",
  whereStored: "whereStored",
  filters: "filters",
  labels: "labels",
} as const;

export type GoodToKnowTopic = (typeof GOOD_TO_KNOW_TOPIC)[keyof typeof GOOD_TO_KNOW_TOPIC];

export const GOOD_TO_KNOW_TOPICS: readonly { topic: GoodToKnowTopic; icon: string }[] = [
  { topic: GOOD_TO_KNOW_TOPIC.saving, icon: "mdi-cloud-upload-outline" },
  { topic: GOOD_TO_KNOW_TOPIC.scenes, icon: "mdi-lightbulb-off-outline" },
  { topic: GOOD_TO_KNOW_TOPIC.folders, icon: "mdi-folder-outline" },
  { topic: GOOD_TO_KNOW_TOPIC.unknownBlocks, icon: "mdi-puzzle-outline" },
  { topic: GOOD_TO_KNOW_TOPIC.changedInHa, icon: "mdi-sync-alert" },
  { topic: GOOD_TO_KNOW_TOPIC.whereStored, icon: "mdi-account-outline" },
  { topic: GOOD_TO_KNOW_TOPIC.filters, icon: "mdi-filter-outline" },
  { topic: GOOD_TO_KNOW_TOPIC.labels, icon: "mdi-label-outline" },
];
