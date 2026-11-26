import { BadRequestException, NotFoundException } from "@nestjs/common";

import type { CategoriesService } from "../categories/categories.service";
import { EMPTY_OVERLAY, type Overlay } from "../overlay/overlay.model";
import { EntriesService } from "./entries.service";
import type { Entry } from "./entry.model";
import type { EntryRepository, UpdateEntryOptions } from "./repositories/entry.repository";

function entry(overrides: Partial<Entry>): Entry {
  return {
    entityId: "script.example",
    kind: "script",
    domain: "script",
    name: "Example",
    icon: null,
    categoryId: null,
    categoryPath: null,
    labels: [],
    area: null,
    state: "off",
    isDisabled: false,
    isHidden: false,
    isInRegistry: true,
    isFavorite: false,
    note: null,
    ...overrides,
  };
}

function setup(entries: Entry[], overlayData: Overlay = structuredClone(EMPTY_OVERLAY)) {
  const update = jest.fn().mockResolvedValue(undefined);
  const callService = jest.fn().mockResolvedValue(undefined);
  const findAll = jest.fn().mockResolvedValue(entries);
  const findOne = jest.fn((entityId: string) =>
    Promise.resolve(entries.find((item) => item.entityId === entityId) ?? null),
  );
  const findDetails = jest.fn().mockResolvedValue({ aliases: ["Licht draußen"] });
  const repository: EntryRepository = { findAll, findOne, update, callService, findDetails };
  const overlay = {
    data: overlayData,
    read: () => Promise.resolve(structuredClone(overlay.data)),
    update: (change: (current: Overlay) => Overlay) => {
      overlay.data = change(structuredClone(overlay.data));
      return Promise.resolve(overlay.data);
    },
  };
  const assign = jest.fn().mockResolvedValue(undefined);
  const categories = { assign } as unknown as CategoriesService;
  const service = new EntriesService(repository, overlay, categories);

  return { service, assign, update, callService, overlay, findAll, findOne, findDetails };
}

describe("EntriesService", () => {
  it("returns all entries with extras, sorted by name, ignoring case", async () => {
    const { service } = setup(
      [entry({ name: "gute Nacht", entityId: "script.a" }), entry({ name: "Alles aus" })],
      { ...EMPTY_OVERLAY, favorites: ["script.a"] },
    );

    const entries = await service.findAll();

    expect(entries.map((item) => [item.name, item.isFavorite])).toEqual([
      ["Alles aus", false],
      ["gute Nacht", true],
    ]);
  });

  it("moves an entry using the category scope of its kind", async () => {
    const { service, assign } = setup([
      entry({ entityId: "input_boolean.gaeste", kind: "helper", categoryId: "cat-1" }),
    ]);

    await service.moveToCategory({ entityId: "input_boolean.gaeste", categoryPath: "Haus/Pool" });

    expect(assign).toHaveBeenCalledWith({
      entityId: "input_boolean.gaeste",
      scope: "helpers",
      currentCategoryId: "cat-1",
      targetPath: "Haus/Pool",
    });
  });

  it("throws NotFoundException for an unknown entity", async () => {
    const { service } = setup([]);

    await expect(
      service.moveToCategory({ entityId: "script.nope", categoryPath: null }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it("refuses to change YAML entities without registry entry", async () => {
    const { service, assign, update } = setup([
      entry({ entityId: "script.yaml", isInRegistry: false }),
    ]);

    await expect(
      service.moveToCategory({ entityId: "script.yaml", categoryPath: "Haus" }),
    ).rejects.toBeInstanceOf(BadRequestException);
    await expect(
      service.update({ entityId: "script.yaml", changes: { name: "X" } }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(assign).not.toHaveBeenCalled();
    expect(update).not.toHaveBeenCalled();
  });

  it("sends a blank name and icon as null, so HA goes back to its defaults", async () => {
    const { service, update } = setup([entry({})]);

    await service.update({
      entityId: "script.example",
      changes: { name: "  ", icon: "", labelIds: ["licht"] },
    });

    expect(update).toHaveBeenCalledWith({
      entityId: "script.example",
      changes: {
        name: null,
        icon: null,
        labelIds: ["licht"],
      },
    });
  });

  it("cleans aliases: trimmed, no blanks, each name once", async () => {
    const { service, update } = setup([entry({})]);

    await service.update({
      entityId: "script.example",
      changes: { aliases: [" Licht ", "", "licht", "Lampe"] },
    });

    const [[sent]] = update.mock.calls as [[UpdateEntryOptions]];
    expect(sent.entityId).toBe("script.example");
    expect(sent.changes.aliases).toEqual(["Licht", "Lampe"]);
  });

  it("maps actions to the service of the domain", async () => {
    const { service, callService } = setup([
      entry({ entityId: "automation.licht", domain: "automation", kind: "automation" }),
      entry({ entityId: "input_button.klingel", domain: "input_button", kind: "helper" }),
    ]);

    await service.runAction({ entityId: "automation.licht", action: "turnOff" });
    await service.runAction({ entityId: "input_button.klingel", action: "run" });

    expect(callService).toHaveBeenNthCalledWith(1, {
      domain: "automation",
      service: "turn_off",
      entityId: "automation.licht",
    });
    expect(callService).toHaveBeenNthCalledWith(2, {
      domain: "input_button",
      service: "press",
      entityId: "input_button.klingel",
    });
  });

  it("rejects actions the domain does not have", async () => {
    const { service, callService } = setup([entry({ entityId: "scene.kino", domain: "scene" })]);

    await expect(
      service.runAction({ entityId: "scene.kino", action: "turnOff" }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(callService).not.toHaveBeenCalled();
  });

  it("stores favorite and note in the overlay", async () => {
    const { service, overlay } = setup([entry({})]);

    await service.updateExtras({
      entityId: "script.example",
      extras: { isFavorite: true, note: "Wichtig" },
    });

    expect(overlay.data).toMatchObject({
      favorites: ["script.example"],
      notes: { "script.example": "Wichtig" },
    });
  });

  it("reads the details of one entry without loading every entry", async () => {
    const { service, findAll, findOne, findDetails } = setup([entry({})]);

    await expect(service.details("script.example")).resolves.toEqual({
      aliases: ["Licht draußen"],
    });
    expect(findDetails).toHaveBeenCalledWith("script.example");
    expect(findAll).not.toHaveBeenCalled();
    expect(findOne).not.toHaveBeenCalled();
  });

  it("refuses details for an entity without a registry entry", async () => {
    const { service, findDetails } = setup([]);
    findDetails.mockResolvedValueOnce(null);

    await expect(service.details("automation.yaml_only")).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });
});
