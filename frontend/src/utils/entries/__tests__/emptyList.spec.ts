import { describe, expect, it } from "vitest";

import type { ListScope } from "@/constants/entries";

import { emptyListReason, isListNarrowed } from "../emptyList";

/** What the filter tabs would show in "Arbeitszimmer": 35 entries, none of them a scene. */
const counts: Record<ListScope, number> = {
  all: 35,
  automation: 9,
  script: 8,
  scene: 0,
  helper: 18,
  entities: 0,
};
const none: Record<ListScope, number> = {
  all: 0,
  automation: 0,
  script: 0,
  scene: 0,
  helper: 0,
  entities: 0,
};
const inFolder = { isRealCategory: true, isSearching: false };

describe("isListNarrowed", () => {
  it("marks filters that hide entries, but not 'Alle'", () => {
    expect(isListNarrowed(["scene"])).toBe(true);
    expect(isListNarrowed(["automation", "entities"])).toBe(true);
    expect(isListNarrowed(["entities"])).toBe(true);
    expect(isListNarrowed(["all"])).toBe(false);
    expect(isListNarrowed(["all", "entities"])).toBe(false);
  });
});

describe("emptyListReason", () => {
  it("names what a filter hides in a folder that is not empty", () => {
    const filtered = { kind: "filtered", hides: "entries", count: 35 };

    expect(emptyListReason({ scopes: ["scene"], counts, ...inFolder })).toEqual(filtered);
    expect(
      emptyListReason({ scopes: ["scene"], counts, isRealCategory: true, isSearching: true }),
    ).toEqual(filtered);
  });

  it("names entries before entities, since 'Alle zeigen' brings back only entries", () => {
    const withDevices = { ...counts, entities: 87 };

    expect(emptyListReason({ scopes: ["scene"], counts: withDevices, ...inFolder })).toEqual({
      kind: "filtered",
      hides: "entries",
      count: 35,
    });
  });

  it("names hidden entities when no entry is hidden", () => {
    const onlyDevices = { ...none, entities: 87 };

    expect(emptyListReason({ scopes: ["all"], counts: onlyDevices, ...inFolder })).toEqual({
      kind: "filtered",
      hides: "entities",
      count: 87,
    });
  });

  it("keeps the old texts when nothing is hidden", () => {
    expect(emptyListReason({ scopes: ["scene"], counts: none, ...inFolder })).toEqual({
      kind: "emptyFolder",
    });
    expect(emptyListReason({ scopes: ["all"], counts: none, ...inFolder })).toEqual({
      kind: "emptyFolder",
    });
    expect(
      emptyListReason({ scopes: ["all"], counts: none, isRealCategory: true, isSearching: true }),
    ).toEqual({ kind: "nothing" });
    expect(
      emptyListReason({ scopes: ["all"], counts: none, isRealCategory: false, isSearching: false }),
    ).toEqual({ kind: "nothing" });
  });
});
