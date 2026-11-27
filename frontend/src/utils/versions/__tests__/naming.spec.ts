import { describe, expect, it } from "vitest";

import { VERSION_LIMITS } from "@/constants/versions";

import { quickVersions, wouldDropWhenUnnamed } from "../naming";

const versionsWith = (count: number, named: Record<number, string> = {}) =>
  Array.from({ length: count }, (_, index) => ({ id: `v${index}`, name: named[index] }));

describe("wouldDropWhenUnnamed", () => {
  it("asks only when as many newer unnamed versions exist as stay", () => {
    const versions = versionsWith(VERSION_LIMITS.unnamed + 1, { 0: "läuft stabil" });

    expect(wouldDropWhenUnnamed({ versions, versionId: "v0" })).toBe(true);
    expect(wouldDropWhenUnnamed({ versions, versionId: "v1" })).toBe(false);
    expect(wouldDropWhenUnnamed({ versions: versions.slice(0, -1), versionId: "v0" })).toBe(false);
    expect(wouldDropWhenUnnamed({ versions, versionId: "unknown" })).toBe(false);
  });

  it("does not count other named versions", () => {
    const versions = versionsWith(VERSION_LIMITS.unnamed + 1, { 0: "alt", 5: "gemerkt" });

    expect(wouldDropWhenUnnamed({ versions, versionId: "v0" })).toBe(false);
  });
});

describe("quickVersions", () => {
  const ids = (list: { id: string }[]): string[] => list.map((item) => item.id);
  // v0 … v4 before "Jetzt" (v5)
  const versions = versionsWith(6);

  it("offers the newest three before Jetzt, in time order", () => {
    expect(ids(quickVersions({ versions, index: 4, count: 3 }))).toEqual(["v2", "v3", "v4"]);
    expect(ids(quickVersions({ versions, index: 2, count: 3 }))).toEqual(["v2", "v3", "v4"]);
  });

  it("slides along when an older version is chosen", () => {
    expect(ids(quickVersions({ versions, index: 1, count: 3 }))).toEqual(["v1", "v2", "v3"]);
    expect(ids(quickVersions({ versions, index: 0, count: 3 }))).toEqual(["v0", "v1", "v2"]);
  });

  it("copes with fewer versions than chips", () => {
    expect(ids(quickVersions({ versions: versionsWith(3), index: 0, count: 3 }))).toEqual([
      "v0",
      "v1",
    ]);
  });
});
