import type { LocationQuery, LocationQueryRaw } from "vue-router";

import {
  GOOD_TO_KNOW_TOPICS,
  SETTINGS_TAB,
  SETTINGS_TABS,
  type GoodToKnowTopic,
  type SettingsTab,
} from "@/constants/settings";

/**
 * Where the settings window stands. Every step the user can go back from is an entry in the
 * browser history (a query on the route), so the back gesture of a phone goes exactly one step and
 * never leaves the HomeAce panel.
 */
export type SettingsPlace = {
  /** The open section; null for the start: the list of sections, or the tab used last. */
  section: SettingsTab | null;
  /** A topic of "Gut zu wissen" on a page of its own (list layout only). */
  topic: GoodToKnowTopic | null;
};

/** A place in the browser history, with how many entries of the window lead up to it. */
export type SettingsEntry = SettingsPlace & {
  /** 1 for the first entry the window made; closing goes back this many entries. */
  step: number;
};

/** The route query keys of the window; every other key in the query stays as it is. */
export const SETTINGS_QUERY = {
  place: "settings",
  topic: "topic",
  step: "step",
} as const;

const SETTINGS_QUERY_KEYS: ReadonlySet<string> = new Set(Object.values(SETTINGS_QUERY));

/** The place value of the start. */
const HOME = "home";

/**
 * The window never stacks more than start → section → topic. It also bounds a step read from the
 * address, so closing never goes back further than the window's own entries.
 */
export const MAX_SETTINGS_STEP = 3;

export const SETTINGS_HOME: SettingsPlace = { section: null, topic: null };

export function isSettingsTab(value: string | null): value is SettingsTab {
  return SETTINGS_TABS.some((entry) => entry.tab === value);
}

export function isGoodToKnowTopic(value: string | null): value is GoodToKnowTopic {
  return GOOD_TO_KNOW_TOPICS.some((entry) => entry.topic === value);
}

/** A query value may be repeated in the address (`?a=1&a=2`); the first one counts. */
function firstValue(value: LocationQuery[string] | undefined): string | null {
  if (Array.isArray(value)) return value[0] ?? null;

  return value ?? null;
}

function stepFrom(value: string | null): number {
  const step = Number.parseInt(value ?? "", 10);
  if (Number.isNaN(step)) return 1;

  return Math.min(Math.max(step, 1), MAX_SETTINGS_STEP);
}

/**
 * The window's entry in a route query.
 *
 * @param query - The route query. It comes from the address, so every value is checked.
 * @returns null when the window is closed or the query names no known place. A topic counts only
 *   on the page of "Gut zu wissen"; a missing or odd step counts as 1, a large one as the maximum.
 * @example settingsEntryFromQuery({ settings: "goodToKnow", topic: "labels", step: "3" })
 *   // { section: "goodToKnow", topic: "labels", step: 3 }
 */
export function settingsEntryFromQuery(query: LocationQuery): SettingsEntry | null {
  // Which place
  const placeValue = firstValue(query[SETTINGS_QUERY.place]);
  const section = isSettingsTab(placeValue) ? placeValue : null;
  const isKnownPlace = section !== null || placeValue === HOME;
  if (!isKnownPlace) return null;

  // The topic counts only on the page of "Gut zu wissen"
  const topicValue = firstValue(query[SETTINGS_QUERY.topic]);
  const isTopicPage = section === SETTINGS_TAB.goodToKnow && isGoodToKnowTopic(topicValue);
  const topic = isTopicPage ? topicValue : null;

  const step = stepFrom(firstValue(query[SETTINGS_QUERY.step]));

  return { section, topic, step };
}

/**
 * The route query with the window at an entry, or closed.
 *
 * @param query - The current route query; keys the window does not use stay as they are.
 * @param entry - Where the window goes; null closes it.
 */
export function settingsQuery({
  query,
  entry,
}: {
  query: LocationQuery;
  entry: SettingsEntry | null;
}): LocationQueryRaw {
  const otherEntries = Object.entries(query).filter(([key]) => !SETTINGS_QUERY_KEYS.has(key));
  const otherQuery = Object.fromEntries(otherEntries);
  if (!entry) return otherQuery;

  const windowQuery: Record<string, string> = {
    [SETTINGS_QUERY.place]: entry.section ?? HOME,
    [SETTINGS_QUERY.step]: String(entry.step),
  };
  if (entry.topic) windowQuery[SETTINGS_QUERY.topic] = entry.topic;

  return { ...otherQuery, ...windowQuery };
}

/**
 * The places from the start to a place, as the list layout stacks them in the history.
 *
 * @example placeChain({ section: "goodToKnow", topic: "labels" })
 *   // [start, { section: "goodToKnow", topic: null }, { section: "goodToKnow", topic: "labels" }]
 */
export function placeChain(place: SettingsPlace): SettingsPlace[] {
  const chain = [SETTINGS_HOME];
  if (!place.section) return chain;

  chain.push({ section: place.section, topic: null });
  if (place.topic) chain.push({ section: place.section, topic: place.topic });

  return chain;
}

/** Where "‹" leads: from a topic to its page, from a page to the start; null at the start. */
export function parentPlace(place: SettingsPlace): SettingsPlace | null {
  if (place.topic) return { section: place.section, topic: null };
  if (place.section) return SETTINGS_HOME;

  return null;
}

export function isSameEntry(entry: SettingsEntry | null, other: SettingsEntry): boolean {
  if (!entry) return false;

  const isSamePlace = entry.section === other.section && entry.topic === other.topic;
  return isSamePlace && entry.step === other.step;
}
