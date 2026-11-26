import { isSameOrBelow, normalizeCategoryPath, replacePathPrefix } from "./category-path";

describe("normalizeCategoryPath", () => {
  it("trims every level", () => {
    expect(normalizeCategoryPath(" Haus / Terrasse ")).toBe("Haus/Terrasse");
  });

  it("rejects empty levels", () => {
    expect(normalizeCategoryPath("")).toBeNull();
    expect(normalizeCategoryPath("Haus//Terrasse")).toBeNull();
    expect(normalizeCategoryPath("Haus/ ")).toBeNull();
  });
});

describe("isSameOrBelow", () => {
  it("compares whole levels", () => {
    expect(isSameOrBelow({ path: "Haus", ancestor: "Haus" })).toBe(true);
    expect(isSameOrBelow({ path: "Haus/Terrasse", ancestor: "Haus" })).toBe(true);
    expect(isSameOrBelow({ path: "Hausflur", ancestor: "Haus" })).toBe(false);
  });
});

describe("replacePathPrefix", () => {
  it("swaps the leading part and keeps the rest", () => {
    expect(replacePathPrefix({ path: "Haus/Terrasse/Licht", from: "Haus", to: "Heim" })).toBe(
      "Heim/Terrasse/Licht",
    );
    expect(replacePathPrefix({ path: "Haus", from: "Haus", to: "Heim" })).toBe("Heim");
  });
});
