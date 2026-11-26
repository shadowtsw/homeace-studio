import { describe, expect, it } from "vitest";

import type { CategoryNode } from "../categoryTree";
import { applyFolderOrder, moveSibling, parentOf } from "../folderOrder";

const node = (path: string, children: CategoryNode[] = []): CategoryNode =>
  ({ path, name: path.split("/").pop() ?? path, children }) as CategoryNode;

describe("applyFolderOrder", () => {
  it("puts listed folders first in that order, the rest after them, on every level", () => {
    const tree = [
      node("Energie"),
      node("Haus", [node("Haus/Bad"), node("Haus/Flur")]),
      node("Sicherheit"),
    ];

    const sorted = applyFolderOrder(tree, { "": ["Sicherheit", "Haus"], Haus: ["Haus/Flur"] });

    expect(sorted.map((item) => item.path)).toEqual(["Sicherheit", "Haus", "Energie"]);
    expect(sorted[1]?.children.map((item) => item.path)).toEqual(["Haus/Flur", "Haus/Bad"]);
  });
});

describe("moveSibling", () => {
  it("moves a folder before or after another", () => {
    expect(moveSibling(["A", "B", "C"], "C", "A", true)).toEqual(["C", "A", "B"]);
    expect(moveSibling(["A", "B", "C"], "A", "C", false)).toEqual(["B", "C", "A"]);
  });
});

describe("parentOf", () => {
  it("is empty for the top level", () => {
    expect(parentOf("Haus/Bad")).toBe("Haus");
    expect(parentOf("Haus")).toBe("");
  });
});
