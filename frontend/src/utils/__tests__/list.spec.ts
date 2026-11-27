import { describe, expect, it } from "vitest";

import { asList, toggleItem } from "../list";

describe("toggleItem", () => {
  it("takes an item out that is in the list", () => {
    expect(toggleItem({ items: ["a", "b", "c"], item: "b" })).toEqual(["a", "c"]);
  });

  it("adds an item at the end that is not in the list", () => {
    expect(toggleItem({ items: ["a"], item: "b" })).toEqual(["a", "b"]);
    expect(toggleItem({ items: [], item: "a" })).toEqual(["a"]);
  });

  it("leaves the given list as it is", () => {
    const items = ["a", "b"];

    toggleItem({ items, item: "a" });
    toggleItem({ items, item: "c" });

    expect(items).toEqual(["a", "b"]);
  });
});

describe("asList", () => {
  it("gives an empty list for nothing", () => {
    expect(asList(undefined)).toEqual([]);
    expect(asList(null)).toEqual([]);
  });

  it("keeps a list and wraps a single value", () => {
    const list = ["light.a", "light.b"];

    expect(asList(list)).toBe(list);
    expect(asList("light.a")).toEqual(["light.a"]);
    expect(asList(0)).toEqual([0]);
    expect(asList(false)).toEqual([false]);
  });
});
