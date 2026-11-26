import { moveFolderOrder, parentOf } from "./folder-order";

describe("folder order", () => {
  it("follows renamed folders, as parent and as child", () => {
    const move = (path: string): string => path.replace(/^Haus/, "Heim");

    expect(
      moveFolderOrder({
        order: { "": ["Haus", "Garage"], Haus: ["Haus/Bad", "Haus/Flur"] },
        movePath: move,
      }),
    ).toEqual({
      "": ["Heim", "Garage"],
      Heim: ["Heim/Bad", "Heim/Flur"],
    });
  });

  it("knows the parent", () => {
    expect(parentOf("Haus/Terrasse")).toBe("Haus");
    expect(parentOf("Haus")).toBe("");
  });
});
