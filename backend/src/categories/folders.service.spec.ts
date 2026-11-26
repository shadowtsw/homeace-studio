import { ConflictException, NotFoundException } from "@nestjs/common";

import { EMPTY_OVERLAY, type Overlay } from "../overlay/overlay.model";
import type { OverlayRepository } from "../overlay/repositories/overlay.repository";
import { FoldersService } from "./folders.service";

class FakeOverlay implements OverlayRepository {
  data: Overlay = structuredClone(EMPTY_OVERLAY);
  read = () => Promise.resolve(structuredClone(this.data));
  update = (change: (overlay: Overlay) => Overlay) => {
    this.data = change(structuredClone(this.data));
    return Promise.resolve(this.data);
  };
}

describe("FoldersService", () => {
  let overlay: FakeOverlay;
  let service: FoldersService;

  beforeEach(() => {
    overlay = new FakeOverlay();
    service = new FoldersService(overlay);
  });

  it("stores a normalized folder and lists folders sorted", async () => {
    await service.create(" Haus / Pool ");
    await service.create("Garage");

    const overview = await service.findAll();
    expect(overview.saved).toEqual(["Garage", "Haus/Pool"]);
  });

  it("sets and removes a folder color, and drops it when the folder is deleted", async () => {
    await service.create("Haus/Pool");
    await service.setColor({ path: "Haus/Pool", color: "#e3a64e" });
    await service.setColor({ path: "Garage", color: "#2f9b68" });
    await service.setColor({ path: "Garage", color: null });

    expect(overlay.data.folderColors).toEqual({ "Haus/Pool": "#e3a64e" });

    await service.delete("Haus/Pool");
    expect(overlay.data.folderColors).toEqual({});
  });

  it("keeps an own order of subfolders per parent; an empty list goes back to A-Z", async () => {
    await service.setOrder({ parent: "", order: ["Haus", "Energie"] });
    await service.setOrder({ parent: "Haus", order: ["Haus/Terrasse", "Haus/Garten"] });

    expect((await service.findAll()).order).toEqual({
      "": ["Haus", "Energie"],
      Haus: ["Haus/Terrasse", "Haus/Garten"],
    });

    await service.setOrder({ parent: "Haus", order: [] });
    expect(overlay.data.folderOrder).toEqual({ "": ["Haus", "Energie"] });
    await expect(service.setOrder({ parent: "Haus", order: ["Energie"] })).rejects.toMatchObject({
      response: { message: "CATEGORY_PATH_INVALID" },
    });
  });

  it("refuses the same folder twice", async () => {
    await service.create("Haus/Pool");

    await expect(service.create("Haus/Pool")).rejects.toBeInstanceOf(ConflictException);
  });

  it("deletes a folder and reports unknown ones", async () => {
    await service.create("Haus/Pool");
    await service.delete("Haus/Pool");

    expect(overlay.data.folders).toEqual([]);
    await expect(service.delete("Haus/Pool")).rejects.toBeInstanceOf(NotFoundException);
  });
});
