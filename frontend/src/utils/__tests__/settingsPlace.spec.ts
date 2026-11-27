import { describe, expect, it } from "vitest";

import {
  MAX_SETTINGS_STEP,
  SETTINGS_HOME,
  isSameEntry,
  parentPlace,
  placeChain,
  settingsEntryFromQuery,
  settingsQuery,
  tabChain,
  type SettingsPlace,
} from "@/utils/settingsPlace";

const ABOUT: SettingsPlace = { section: "about", topic: null, subPage: null };
const GOOD_TO_KNOW: SettingsPlace = { section: "goodToKnow", topic: null, subPage: null };
const LABELS_TOPIC: SettingsPlace = { section: "goodToKnow", topic: "labels", subPage: null };
const APPEARANCE: SettingsPlace = { section: "appearance", topic: null, subPage: null };
const THEME_IMPORT: SettingsPlace = { ...APPEARANCE, subPage: "themeImport" };

describe("settingsEntryFromQuery", () => {
  it("is closed without its key or with a place it does not know", () => {
    expect(settingsEntryFromQuery({})).toBeNull();
    expect(settingsEntryFromQuery({ settings: "colors" })).toBeNull();
    expect(settingsEntryFromQuery({ settings: null })).toBeNull();
  });

  it("reads the start, a section, a topic of Gut zu wissen and a page below Aussehen", () => {
    expect(settingsEntryFromQuery({ settings: "home", step: "1" })).toEqual({
      ...SETTINGS_HOME,
      step: 1,
    });
    expect(settingsEntryFromQuery({ settings: "about", step: "2" })).toEqual({
      ...ABOUT,
      step: 2,
    });
    expect(settingsEntryFromQuery({ settings: "goodToKnow", topic: "labels", step: "3" })).toEqual({
      ...LABELS_TOPIC,
      step: 3,
    });
    expect(
      settingsEntryFromQuery({ settings: "appearance", page: "themeImport", step: "3" }),
    ).toEqual({ ...THEME_IMPORT, step: 3 });
  });

  it("takes a topic or a page only below its own section, and only a known one", () => {
    expect(settingsEntryFromQuery({ settings: "tools", topic: "labels" })?.topic).toBeNull();
    expect(settingsEntryFromQuery({ settings: "goodToKnow", topic: "nope" })?.topic).toBeNull();
    expect(settingsEntryFromQuery({ settings: "tools", page: "themeImport" })?.subPage).toBeNull();
    expect(settingsEntryFromQuery({ settings: "appearance", page: "nope" })?.subPage).toBeNull();
  });

  it("keeps a step from the address within the window's own entries", () => {
    expect(settingsEntryFromQuery({ settings: "home" })?.step).toBe(1);
    expect(settingsEntryFromQuery({ settings: "home", step: "x" })?.step).toBe(1);
    expect(settingsEntryFromQuery({ settings: "home", step: "0" })?.step).toBe(1);
    expect(settingsEntryFromQuery({ settings: "home", step: "50" })?.step).toBe(MAX_SETTINGS_STEP);
  });

  it("uses the first value of a repeated key", () => {
    expect(settingsEntryFromQuery({ settings: ["about", "tools"] })?.section).toBe("about");
  });
});

describe("settingsQuery", () => {
  it("writes the window's keys and keeps every other key", () => {
    const query = settingsQuery({
      query: { other: "1", settings: "home", step: "1" },
      entry: { ...LABELS_TOPIC, step: 3 },
    });

    expect(query).toEqual({ other: "1", settings: "goodToKnow", topic: "labels", step: "3" });
  });

  it("writes a page below a section", () => {
    const query = settingsQuery({ query: {}, entry: { ...THEME_IMPORT, step: 2 } });

    expect(query).toEqual({ settings: "appearance", page: "themeImport", step: "2" });
  });

  it("closing takes out only the window's keys", () => {
    const query = settingsQuery({
      query: { other: "1", settings: "appearance", page: "themeImport", step: "3" },
      entry: null,
    });

    expect(query).toEqual({ other: "1" });
  });

  it("writes the start as home and leaves out an empty topic", () => {
    const query = settingsQuery({ query: {}, entry: { ...SETTINGS_HOME, step: 1 } });

    expect(query).toEqual({ settings: "home", step: "1" });
  });
});

describe("chains and parents", () => {
  it("list layout: stacks start → section → topic or page", () => {
    expect(placeChain(SETTINGS_HOME)).toEqual([SETTINGS_HOME]);
    expect(placeChain(ABOUT)).toEqual([SETTINGS_HOME, ABOUT]);
    expect(placeChain(LABELS_TOPIC)).toEqual([SETTINGS_HOME, GOOD_TO_KNOW, LABELS_TOPIC]);
    expect(placeChain(THEME_IMPORT)).toEqual([SETTINGS_HOME, APPEARANCE, THEME_IMPORT]);
  });

  it("tab layout: the tab, and a page below it as a step of its own", () => {
    expect(tabChain({ place: ABOUT, fallbackSection: null })).toEqual([ABOUT]);
    expect(tabChain({ place: THEME_IMPORT, fallbackSection: null })).toEqual([
      APPEARANCE,
      THEME_IMPORT,
    ]);
    // Without a section the tab shown now stays
    expect(tabChain({ place: SETTINGS_HOME, fallbackSection: "tools" })).toEqual([
      { section: "tools", topic: null, subPage: null },
    ]);
  });

  it("leads one step up, and nowhere from the start", () => {
    expect(parentPlace(LABELS_TOPIC)).toEqual(GOOD_TO_KNOW);
    expect(parentPlace(THEME_IMPORT)).toEqual(APPEARANCE);
    expect(parentPlace(ABOUT)).toEqual(SETTINGS_HOME);
    expect(parentPlace(SETTINGS_HOME)).toBeNull();
  });
});

describe("isSameEntry", () => {
  it("compares place and step", () => {
    const entry = { ...ABOUT, step: 2 };

    expect(isSameEntry(entry, { ...entry })).toBe(true);
    expect(isSameEntry(entry, { ...entry, step: 1 })).toBe(false);
    expect(isSameEntry({ ...APPEARANCE, step: 2 }, { ...THEME_IMPORT, step: 2 })).toBe(false);
    expect(isSameEntry(null, entry)).toBe(false);
  });
});
