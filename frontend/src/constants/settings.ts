/**
 * The sections of the settings window, in the order they are shown: tabs on wide screens, the list
 * of pages on phones (and wherever the tabs do not fit in one row).
 */
export const SETTINGS_TAB = {
  general: "general",
  appearance: "appearance",
  editing: "editing",
  tools: "tools",
  ai: "ai",
  goodToKnow: "goodToKnow",
  about: "about",
} as const;

export type SettingsTab = (typeof SETTINGS_TAB)[keyof typeof SETTINGS_TAB];

export const SETTINGS_TABS: readonly { tab: SettingsTab; icon: string }[] = [
  { tab: SETTINGS_TAB.general, icon: "mdi-tune-variant" },
  { tab: SETTINGS_TAB.appearance, icon: "mdi-palette-outline" },
  { tab: SETTINGS_TAB.editing, icon: "mdi-pencil-outline" },
  { tab: SETTINGS_TAB.tools, icon: "mdi-tools" },
  { tab: SETTINGS_TAB.ai, icon: "mdi-creation" },
  { tab: SETTINGS_TAB.goodToKnow, icon: "mdi-lightbulb-outline" },
  { tab: SETTINGS_TAB.about, icon: "mdi-information-outline" },
];

/**
 * Up to this width the window always shows the list of sections and one page at a time, like the
 * detail layer on phones. Wider, it shows tabs when all of them fit in one row.
 */
export const SETTINGS_LIST_MEDIA_QUERY = "(max-width: 820px)";

/**
 * From this width the editor's phone preview stands next to the settings window (owner's variant
 * B); narrower, it takes the place of the normal preview inside the editor.
 */
export const PHONE_PREVIEW_SIDE_MEDIA_QUERY = "(min-width: 1260px)";

/**
 * Pages below a section, each a step of its own (the back gesture leads back to the section): the
 * theme import, the text of a theme where copying to the clipboard is not allowed, and the theme
 * editor.
 */
export const SETTINGS_SUB_PAGE = {
  themeImport: "themeImport",
  themeCopy: "themeCopy",
  themeEditor: "themeEditor",
} as const;

export type SettingsSubPage = (typeof SETTINGS_SUB_PAGE)[keyof typeof SETTINGS_SUB_PAGE];

/** The section each page sits below. */
export const SUB_PAGE_SECTION: Record<SettingsSubPage, SettingsTab> = {
  themeImport: SETTINGS_TAB.appearance,
  themeCopy: SETTINGS_TAB.appearance,
  themeEditor: SETTINGS_TAB.appearance,
};

/** Where users report a bug or suggest an idea. */
export const ISSUES_URL = "https://github.com/shadowtsw/homeace-studio/issues";
/** The maker's GitHub profile, for the signature under "Über HomeAce". */
export const AUTHOR_URL = "https://github.com/shadowtsw";

/**
 * Topics of "Gut zu wissen". They explain how HomeAce Studio behaves, never how it is built. Every
 * feature with a quirk brings its topic, in all five languages (settings.goodToKnow.<topic>).
 */
export const GOOD_TO_KNOW_TOPIC = {
  columns: "columns",
  saving: "saving",
  scenes: "scenes",
  folders: "folders",
  unknownBlocks: "unknownBlocks",
  changedInHa: "changedInHa",
  whereStored: "whereStored",
  filters: "filters",
  filterCounts: "filterCounts",
  labels: "labels",
  sortingEntities: "sortingEntities",
  versions: "versions",
} as const;

export type GoodToKnowTopic = (typeof GOOD_TO_KNOW_TOPIC)[keyof typeof GOOD_TO_KNOW_TOPIC];

export const GOOD_TO_KNOW_TOPICS: readonly { topic: GoodToKnowTopic; icon: string }[] = [
  { topic: GOOD_TO_KNOW_TOPIC.columns, icon: "mdi-view-column-outline" },
  { topic: GOOD_TO_KNOW_TOPIC.saving, icon: "mdi-cloud-upload-outline" },
  { topic: GOOD_TO_KNOW_TOPIC.scenes, icon: "mdi-lightbulb-off-outline" },
  { topic: GOOD_TO_KNOW_TOPIC.folders, icon: "mdi-folder-outline" },
  { topic: GOOD_TO_KNOW_TOPIC.unknownBlocks, icon: "mdi-puzzle-outline" },
  { topic: GOOD_TO_KNOW_TOPIC.changedInHa, icon: "mdi-sync-alert" },
  { topic: GOOD_TO_KNOW_TOPIC.whereStored, icon: "mdi-account-outline" },
  { topic: GOOD_TO_KNOW_TOPIC.filters, icon: "mdi-filter-outline" },
  { topic: GOOD_TO_KNOW_TOPIC.filterCounts, icon: "mdi-folder-eye-outline" },
  { topic: GOOD_TO_KNOW_TOPIC.labels, icon: "mdi-label-outline" },
  { topic: GOOD_TO_KNOW_TOPIC.sortingEntities, icon: "mdi-auto-fix" },
  { topic: GOOD_TO_KNOW_TOPIC.versions, icon: "mdi-history" },
];
