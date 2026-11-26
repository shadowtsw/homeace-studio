import { describe, expect, it } from "vitest";

import {
  folderColor,
  isSameOrBelow,
  lastLevel,
  renameLastLevel,
  replacePathPrefix,
  cleanFolderPath,
} from "../categoryPath";

describe("category path helpers", () => {
  it("compares whole levels", () => {
    expect(isSameOrBelow({ path: "Haus/Terrasse", ancestor: "Haus" })).toBe(true);
    expect(isSameOrBelow({ path: "Hausflur", ancestor: "Haus" })).toBe(false);
  });

  it("swaps a prefix and renames the last level", () => {
    expect(
      replacePathPrefix({ path: "Haus/Terrasse/Licht", from: "Haus/Terrasse", to: "Haus/Balkon" }),
    ).toBe("Haus/Balkon/Licht");
    expect(renameLastLevel({ path: "Haus/Terrasse", newName: "Balkon" })).toBe("Haus/Balkon");
    expect(renameLastLevel({ path: "Haus", newName: "Heim" })).toBe("Heim");
    expect(lastLevel("Haus/Terrasse")).toBe("Terrasse");
  });

  it("inherits the color of the nearest colored parent", () => {
    const colors = { Haus: "#c9862f", "Haus/Garten": "#76a43a" };

    expect(folderColor({ path: "Haus/Terrasse/Licht", colors })).toBe("#c9862f");
    expect(folderColor({ path: "Haus/Garten/Pool", colors })).toBe("#76a43a");
    expect(folderColor({ path: "Haus", colors })).toBe("#c9862f");
    expect(folderColor({ path: "Hausflur", colors })).toBeNull();
  });
});

describe("cleanFolderPath", () => {
  it("drops a slash too many and the spaces around levels", () => {
    expect(cleanFolderPath("Küche/")).toBe("Küche");
    expect(cleanFolderPath(" /Haus // Küche / ")).toBe("Haus/Küche");
    expect(cleanFolderPath(" / ")).toBe("");
  });
});
