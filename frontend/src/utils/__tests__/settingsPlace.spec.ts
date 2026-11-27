import { describe, expect, it } from "vitest";

import {
  MAX_SETTINGS_STEP,
  SETTINGS_HOME,
  isSameEntry,
  parentPlace,
  placeChain,
  settingsEntryFromQuery,
  settingsQuery,
} from "@/utils/settingsPlace";

describe("settingsEntryFromQuery", () => {
  it("is closed without its key or with a place it does not know", () => {
    expect(settingsEntryFromQuery({})).toBeNull();
    expect(settingsEntryFromQuery({ settings: "colors" })).toBeNull();
    expect(settingsEntryFromQuery({ settings: null })).toBeNull();
  });

  it("reads the start, a section and a topic of Gut zu wissen", () => {
    expect(settingsEntryFromQuery({ settings: "home", step: "1" })).toEqual({
      section: null,
      topic: null,
      step: 1,
    });
    expect(settingsEntryFromQuery({ settings: "tools", step: "2" })).toEqual({
      section: "tools",
      topic: null,
      step: 2,
    });
    expect(settingsEntryFromQuery({ settings: "goodToKnow", topic: "labels", step: "3" })).toEqual({
      section: "goodToKnow",
      topic: "labels",
      step: 3,
    });
  });

  it("takes a topic only on the page of Gut zu wissen, and only a known one", () => {
    expect(settingsEntryFromQuery({ settings: "tools", topic: "labels" })?.topic).toBeNull();
    expect(settingsEntryFromQuery({ settings: "goodToKnow", topic: "nope" })?.topic).toBeNull();
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
      entry: { section: "goodToKnow", topic: "labels", step: 3 },
    });

    expect(query).toEqual({ other: "1", settings: "goodToKnow", topic: "labels", step: "3" });
  });

  it("closing takes out only the window's keys", () => {
    const query = settingsQuery({
      query: { other: "1", settings: "goodToKnow", topic: "labels", step: "3" },
      entry: null,
    });

    expect(query).toEqual({ other: "1" });
  });

  it("writes the start as home and leaves out an empty topic", () => {
    const query = settingsQuery({ query: {}, entry: { section: null, topic: null, step: 1 } });

    expect(query).toEqual({ settings: "home", step: "1" });
  });
});

describe("placeChain and parentPlace", () => {
  it("stacks start → section → topic", () => {
    expect(placeChain(SETTINGS_HOME)).toEqual([SETTINGS_HOME]);
    expect(placeChain({ section: "about", topic: null })).toEqual([
      SETTINGS_HOME,
      { section: "about", topic: null },
    ]);
    expect(placeChain({ section: "goodToKnow", topic: "labels" })).toEqual([
      SETTINGS_HOME,
      { section: "goodToKnow", topic: null },
      { section: "goodToKnow", topic: "labels" },
    ]);
  });

  it("leads one step up, and nowhere from the start", () => {
    expect(parentPlace({ section: "goodToKnow", topic: "labels" })).toEqual({
      section: "goodToKnow",
      topic: null,
    });
    expect(parentPlace({ section: "about", topic: null })).toEqual(SETTINGS_HOME);
    expect(parentPlace(SETTINGS_HOME)).toBeNull();
  });
});

describe("isSameEntry", () => {
  it("compares place and step", () => {
    const entry = { section: "about" as const, topic: null, step: 2 };

    expect(isSameEntry(entry, { ...entry })).toBe(true);
    expect(isSameEntry(entry, { ...entry, step: 1 })).toBe(false);
    expect(isSameEntry(null, entry)).toBe(false);
  });
});
