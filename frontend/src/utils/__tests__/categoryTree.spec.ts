import { describe, expect, it } from "vitest";

import {
  buildCategoryTree,
  flattenCategoryPaths,
  isEmptyInFilter,
  type CategoryNode,
} from "../categoryTree";

describe("buildCategoryTree", () => {
  it("nests levels separated by / and counts entries per node and in total", () => {
    const tree = buildCategoryTree(["Haus/Terrasse", "Haus/Terrasse", "Haus", "Haus/Garten"]);

    expect(tree).toHaveLength(1);
    expect(tree[0]).toMatchObject({
      path: "Haus",
      ownCount: 1,
      totalCount: 4,
      isFolderOnly: false,
    });
    expect(tree[0]?.children.map((child) => [child.path, child.ownCount])).toEqual([
      ["Haus/Garten", 1],
      ["Haus/Terrasse", 2],
    ]);
  });

  it("creates folder-only parents for paths whose prefix is no category", () => {
    const tree = buildCategoryTree(["Arbeitszimmer/Heizung"]);

    expect(tree[0]).toMatchObject({ name: "Arbeitszimmer", ownCount: 0, isFolderOnly: true });
    expect(tree[0]?.children[0]).toMatchObject({ name: "Heizung", isFolderOnly: false });
  });

  it("skips entries without a category and sorts each level case-insensitively", () => {
    const tree = buildCategoryTree([null, "wohnzimmer", "Bad", "Arbeitszimmer - Heizung"]);

    expect(tree.map((node) => node.name)).toEqual(["Arbeitszimmer - Heizung", "Bad", "wohnzimmer"]);
  });
});

describe("buildCategoryTree with saved folders", () => {
  it("shows empty saved folders and marks them, without counting them", () => {
    const tree = buildCategoryTree(["Haus"], ["Haus/Pool", "Garage"]);

    expect(tree.map((node) => [node.path, node.totalCount, node.isSavedFolder])).toEqual([
      ["Garage", 0, true],
      ["Haus", 1, false],
    ]);
    expect(tree[1]?.children[0]).toMatchObject({ path: "Haus/Pool", isSavedFolder: true });
  });
});

describe("flattenCategoryPaths", () => {
  it("lists parents before their children", () => {
    const tree = buildCategoryTree(["Haus/Terrasse", "Bad"]);

    expect(flattenCategoryPaths(tree)).toEqual(["Bad", "Haus", "Haus/Terrasse"]);
  });

  it("keeps folders of other scopes, counting only the scope shown", () => {
    const tree = buildCategoryTree(
      ["Haus/Garten"],
      ["Haus/Pool"],
      ["Haus/Garten", "Haus/Terrasse"],
    );
    const haus = tree[0]!;

    expect(haus.children.map((node) => [node.name, node.totalCount, node.isCategory])).toEqual([
      ["Garten", 1, true],
      ["Pool", 0, false],
      ["Terrasse", 0, true],
    ]);
    expect(haus.totalCount).toBe(1);
  });
});

describe("isEmptyInFilter", () => {
  it("fades every folder the chosen filter finds nothing in, own empty folders too", () => {
    // Scenes chosen: "Haus/Heizung" holds 3, "Haus/Lampen" only entries of other kinds,
    // "Haus/Sensoren" is a folder made in HomeAce Studio without entries yet
    const tree = buildCategoryTree(
      ["Haus/Heizung", "Haus/Heizung", "Haus/Heizung"],
      ["Haus/Sensoren"],
      ["Haus/Lampen"],
    );
    const faded = flattenCategoryPaths(tree).filter((path) =>
      isEmptyInFilter(findNode(tree, path)),
    );

    expect(faded).toEqual(["Haus/Lampen", "Haus/Sensoren"]);
  });
});

function findNode(nodes: readonly CategoryNode[], path: string): CategoryNode {
  for (const node of nodes) {
    if (node.path === path) return node;
    if (path.startsWith(`${node.path}/`)) return findNode(node.children, path);
  }
  throw new Error(`no folder ${path}`);
}
