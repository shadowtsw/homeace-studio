import { describe, expect, it } from "vitest";

import { showsEntities, showsKind, toggleScope, validScopes } from "../listScopes";

describe("list filters", () => {
  it("shows a kind for 'all' or its own filter, entities only for theirs", () => {
    expect(showsKind({ scopes: ["all"], kind: "script" })).toBe(true);
    expect(showsKind({ scopes: ["automation", "entities"], kind: "script" })).toBe(false);
    expect(showsEntities(["all"])).toBe(false);
    expect(showsEntities(["automation", "entities"])).toBe(true);
  });

  it("adds a filter next to the chosen ones", () => {
    expect(toggleScope({ scopes: ["automation"], scope: "entities" })).toEqual([
      "automation",
      "entities",
    ]);
    expect(toggleScope({ scopes: ["entities"], scope: "script" })).toEqual(["entities", "script"]);
  });

  it("lets 'all' and single kinds replace each other, but keeps entities", () => {
    expect(toggleScope({ scopes: ["all", "entities"], scope: "script" })).toEqual([
      "entities",
      "script",
    ]);
    expect(toggleScope({ scopes: ["automation", "script", "entities"], scope: "all" })).toEqual([
      "entities",
      "all",
    ]);
  });

  it("removes a chosen filter and falls back to 'all' when none is left", () => {
    expect(toggleScope({ scopes: ["automation", "entities"], scope: "entities" })).toEqual([
      "automation",
    ]);
    expect(toggleScope({ scopes: ["entities"], scope: "entities" })).toEqual(["all"]);
    expect(toggleScope({ scopes: ["all"], scope: "all" })).toEqual(["all"]);
  });

  it("keeps only known filters from the browser, never none", () => {
    expect(validScopes(["automation", "gone", "entities"])).toEqual(["automation", "entities"]);
    expect(validScopes("all")).toEqual(["all"]);
    expect(validScopes([])).toEqual(["all"]);
  });
});
