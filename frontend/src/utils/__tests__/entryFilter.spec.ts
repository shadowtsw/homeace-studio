import { describe, expect, it } from "vitest";

import { CATEGORY_FILTER } from "@/constants/entries";
import type { Entry } from "@/types/entry";

import {
  countByScope,
  filterEntries,
  areaFilter,
  areaOfFilter,
  groupByCategory,
  isGroupOpenByDefault,
  isInCategory,
  isSpecialCategory,
} from "../entryFilter";

function entry(overrides: Partial<Entry>): Entry {
  return {
    entityId: "automation.example",
    kind: "automation",
    domain: "automation",
    name: "Example",
    icon: null,
    categoryId: null,
    categoryPath: null,
    labels: [],
    area: null,
    state: "on",
    isDisabled: false,
    isHidden: false,
    isInRegistry: true,
    isFavorite: false,
    note: null,
    ...overrides,
  };
}

describe("area selections", () => {
  const areaIdsOf = (entityId: string) =>
    entityId === "automation.terrace" ? ["terrace", "garden"] : [];

  it("matches entries by their own or derived areas", () => {
    expect(
      isInCategory(entry({ entityId: "automation.terrace" }), areaFilter("garden"), areaIdsOf),
    ).toBe(true);
    expect(
      isInCategory(entry({ entityId: "automation.terrace" }), areaFilter("hallway"), areaIdsOf),
    ).toBe(false);
  });

  it('puts entries without any area under "no area"', () => {
    expect(isInCategory(entry({}), areaFilter(null), areaIdsOf)).toBe(true);
    expect(
      isInCategory(entry({ entityId: "automation.terrace" }), areaFilter(null), areaIdsOf),
    ).toBe(false);
  });

  it("are no folders", () => {
    expect(areaOfFilter(areaFilter("terrace"))).toBe("terrace");
    expect(areaOfFilter(areaFilter(null))).toBeNull();
    expect(areaOfFilter("Haus/Terrasse")).toBeUndefined();
    expect(isSpecialCategory(areaFilter("terrace"))).toBe(true);
  });
});

describe("isInCategory", () => {
  it("includes subcategories but not categories that only start with the same letters", () => {
    expect(isInCategory(entry({ categoryPath: "Haus/Terrasse" }), "Haus")).toBe(true);
    expect(isInCategory(entry({ categoryPath: "Haus" }), "Haus")).toBe(true);
    expect(isInCategory(entry({ categoryPath: "Hausflur" }), "Haus")).toBe(false);
  });

  it("handles the special selections all and uncategorized", () => {
    expect(isInCategory(entry({ categoryPath: "Haus" }), CATEGORY_FILTER.all)).toBe(true);
    expect(isInCategory(entry({ categoryPath: null }), CATEGORY_FILTER.uncategorized)).toBe(true);
    expect(isInCategory(entry({ categoryPath: "Haus" }), CATEGORY_FILTER.uncategorized)).toBe(
      false,
    );
  });
});

describe("filterEntries", () => {
  const entries = [
    entry({
      entityId: "script.gute_nacht",
      kind: "script",
      name: "Gute Nacht",
      categoryPath: "Haus",
    }),
    entry({ entityId: "automation.licht", name: "Licht Terrasse", categoryPath: "Haus/Terrasse" }),
    entry({ entityId: "input_boolean.gaeste", kind: "helper", name: "Gästemodus" }),
  ];

  it("combines scope, category and search on name or entity ID", () => {
    const byScope = filterEntries(entries, { scopes: ["script"], category: "__all", search: "" });
    const bySearch = filterEntries(entries, {
      scopes: ["all"],
      category: "Haus",
      search: "TERRASSE",
    });
    const byEntityId = filterEntries(entries, {
      scopes: ["all"],
      category: "__all",
      search: "gaeste",
    });

    expect(byScope.map((item) => item.name)).toEqual(["Gute Nacht"]);
    expect(bySearch.map((item) => item.name)).toEqual(["Licht Terrasse"]);
    expect(byEntityId.map((item) => item.name)).toEqual(["Gästemodus"]);
  });

  it("counts entries per scope", () => {
    expect(countByScope(entries)).toEqual({
      all: 3,
      automation: 1,
      script: 1,
      scene: 0,
      helper: 1,
    });
  });
});

describe("groupByCategory", () => {
  it("sorts groups by path and puts uncategorized entries last", () => {
    const groups = groupByCategory([
      entry({ name: "A", categoryPath: null }),
      entry({ name: "B", categoryPath: "Haus/Terrasse" }),
      entry({ name: "C", categoryPath: "Haus" }),
    ]);

    expect(groups.map((group) => group.path)).toEqual(["Haus", "Haus/Terrasse", null]);
  });
});

describe("isGroupOpenByDefault", () => {
  const own = { path: "Haus", entries: [entry({ entityId: "automation.a" })] };
  const sub = { path: "Haus/Pool", entries: [entry({ entityId: "automation.b" })] };
  const context = { category: "Haus", selectedEntityId: null, isSearching: false, groupCount: 2 };

  it("opens the folder's own entries and keeps subfolders collapsed", () => {
    expect(isGroupOpenByDefault(own, context)).toBe(true);
    expect(isGroupOpenByDefault(sub, context)).toBe(false);
  });

  it("opens subfolders while searching, with the open entry, or when they are all there is", () => {
    expect(isGroupOpenByDefault(sub, { ...context, isSearching: true })).toBe(true);
    expect(isGroupOpenByDefault(sub, { ...context, selectedEntityId: "automation.b" })).toBe(true);
    expect(isGroupOpenByDefault(sub, { ...context, groupCount: 1 })).toBe(true);
  });

  it("starts collapsed under All, open under Favorites", () => {
    expect(isGroupOpenByDefault(sub, { ...context, category: CATEGORY_FILTER.all })).toBe(false);
    expect(isGroupOpenByDefault(sub, { ...context, category: CATEGORY_FILTER.favorites })).toBe(
      true,
    );
  });
});
