import type { EntryKind } from "@/types/entry";

export const ENTRY_KIND = {
  automation: "automation",
  script: "script",
  scene: "scene",
  helper: "helper",
} as const satisfies Record<EntryKind, EntryKind>;

/** Order of kinds in lists and scope tabs. */
export const ENTRY_KINDS: readonly EntryKind[] = [
  ENTRY_KIND.automation,
  ENTRY_KIND.script,
  ENTRY_KIND.scene,
  ENTRY_KIND.helper,
];

export const ENTRY_KIND_ICON: Record<EntryKind, string> = {
  automation: "mdi-robot-outline",
  script: "mdi-script-text-outline",
  scene: "mdi-palette-outline",
  helper: "mdi-tune-variant",
};

export const SCOPE_ALL = "all";

/** Which kinds the list shows: one kind or all of them. */
export type EntryScope = EntryKind | typeof SCOPE_ALL;

export const ENTRY_SCOPES: readonly EntryScope[] = [SCOPE_ALL, ...ENTRY_KINDS];

/** Not an entry kind: HA's plain entities (lights, sensors, …), a filter of their own. */
export const SCOPE_ENTITIES = "entities";

/** One filter of the list; several can be combined (Strg/⌘+Klick, right-click, long press). */
export type ListScope = EntryScope | typeof SCOPE_ENTITIES;

export const LIST_SCOPES: readonly ListScope[] = [...ENTRY_SCOPES, SCOPE_ENTITIES];

/** Separates the levels inside one HA category name ("Haus/Terrasse"). */
export const CATEGORY_SEPARATOR = "/";

/** Special tree selections next to real category paths. */
export const CATEGORY_FILTER = {
  all: "__all",
  favorites: "__favorites",
  uncategorized: "__uncategorized",
  /** Not a folder: the check-up view (what needs a look). */
  checkup: "__checkup",
} as const;

/**
 * Tree selections of the area view: the prefix plus an area ID; the bare prefix means "no area".
 * @example `${AREA_FILTER_PREFIX}terrace`
 */
export const AREA_FILTER_PREFIX = "__area:";

/** Whether the tree shows folders (HA categories) or areas. */
export const NAV_MODE = {
  folders: "folders",
  areas: "areas",
} as const;

export type NavMode = (typeof NAV_MODE)[keyof typeof NAV_MODE];

export const ENTRY_ACTION = {
  run: "run",
  turnOn: "turnOn",
  turnOff: "turnOff",
} as const;

export type EntryAction = (typeof ENTRY_ACTION)[keyof typeof ENTRY_ACTION];

/** Domains that support each action; mirrors SERVICE_BY_ACTION in the backend. */
export const ACTION_DOMAINS: Record<EntryAction, readonly string[]> = {
  run: ["automation", "script", "scene", "input_button"],
  turnOn: ["automation", "input_boolean"],
  turnOff: ["automation", "input_boolean", "script"],
};

/** Helper domains the backend can delete (storage helpers; not template or group helpers). */
export const DELETABLE_HELPER_DOMAINS: readonly string[] = [
  "input_boolean",
  "input_button",
  "input_number",
  "input_text",
  "input_select",
  "input_datetime",
  "counter",
  "timer",
];

/** Automations and scripts can be deleted when they live in automations.yaml / scripts.yaml. */
export const DELETABLE_FLOW_DOMAINS: readonly string[] = ["automation", "script"];

/** HA state of a switched-on automation or input_boolean. */
export const STATE_ON = "on";

/** What "Neu" in the list can create. */
export const NEW_ENTRY_KIND = {
  automation: "automation",
  script: "script",
  helper: "helper",
} as const;

export type NewEntryKind = (typeof NEW_ENTRY_KIND)[keyof typeof NEW_ENTRY_KIND];

export const NEW_ENTRY_KINDS: readonly NewEntryKind[] = Object.values(NEW_ENTRY_KIND);
