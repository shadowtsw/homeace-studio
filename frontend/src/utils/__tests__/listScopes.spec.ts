import { describe, expect, it } from "vitest";

import { showsEntities, showsKind, toggleScope, validScopes } from "../listScopes";

describe("list filters", () => {
  it("shows a kind for 'all' or its own filter, entities only for theirs", () => {
    expect(showsKind(["all"], "script")).toBe(true);
    expect(showsKind(["automation", "entities"], "script")).toBe(false);
    expect(showsEntities(["all"])).toBe(false);
    expect(showsEntities(["automation", "entities"])).toBe(true);
  });

  it("adds a filter next to the chosen ones", () => {
    expect(toggleScope(["automation"], "entities")).toEqual(["automation", "entities"]);
    expect(toggleScope(["entities"], "script")).toEqual(["entities", "script"]);
  });

  it("lets 'all' and single kinds replace each other, but keeps entities", () => {
    expect(toggleScope(["all", "entities"], "script")).toEqual(["entities", "script"]);
    expect(toggleScope(["automation", "script", "entities"], "all")).toEqual(["entities", "all"]);
  });

  it("removes a chosen filter and falls back to 'all' when none is left", () => {
    expect(toggleScope(["automation", "entities"], "entities")).toEqual(["automation"]);
    expect(toggleScope(["entities"], "entities")).toEqual(["all"]);
    expect(toggleScope(["all"], "all")).toEqual(["all"]);
  });

  it("keeps only known filters from the browser, never none", () => {
    expect(validScopes(["automation", "gone", "entities"])).toEqual(["automation", "entities"]);
    expect(validScopes("all")).toEqual(["all"]);
    expect(validScopes([])).toEqual(["all"]);
  });
});
