import { describe, expect, it } from "vitest";

import { rangeBetween } from "../selection";

describe("shift-click range", () => {
  const order = ["a", "b", "c", "d", "e"];

  it("covers everything between anchor and target, in both directions", () => {
    expect(rangeBetween({ order, anchor: "b", target: "d" })).toEqual(["b", "c", "d"]);
    expect(rangeBetween({ order, anchor: "e", target: "c" })).toEqual(["c", "d", "e"]);
  });

  it("falls back to the clicked row without a usable anchor", () => {
    expect(rangeBetween({ order, anchor: null, target: "c" })).toEqual(["c"]);
    expect(rangeBetween({ order, anchor: "gone", target: "c" })).toEqual(["c"]);
  });
});
