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
    expect(isSameOrBelow("Haus/Terrasse", "Haus")).toBe(true);
    expect(isSameOrBelow("Hausflur", "Haus")).toBe(false);
  });

  it("swaps a prefix and renames the last level", () => {
    expect(replacePathPrefix("Haus/Terrasse/Licht", "Haus/Terrasse", "Haus/Balkon")).toBe(
      "Haus/Balkon/Licht",
    );
    expect(renameLastLevel("Haus/Terrasse", "Balkon")).toBe("Haus/Balkon");
    expect(renameLastLevel("Haus", "Heim")).toBe("Heim");
    expect(lastLevel("Haus/Terrasse")).toBe("Terrasse");
  });

  it("inherits the color of the nearest colored parent", () => {
    const colors = { Haus: "#c9862f", "Haus/Garten": "#76a43a" };

    expect(folderColor("Haus/Terrasse/Licht", colors)).toBe("#c9862f");
    expect(folderColor("Haus/Garten/Pool", colors)).toBe("#76a43a");
    expect(folderColor("Haus", colors)).toBe("#c9862f");
    expect(folderColor("Hausflur", colors)).toBeNull();
  });
});

describe("cleanFolderPath", () => {
  it("drops a slash too many and the spaces around levels", () => {
    expect(cleanFolderPath("Küche/")).toBe("Küche");
    expect(cleanFolderPath(" /Haus // Küche / ")).toBe("Haus/Küche");
    expect(cleanFolderPath(" / ")).toBe("");
  });
});
