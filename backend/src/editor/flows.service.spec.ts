import { Logger } from "@nestjs/common";

import type { CategoriesService } from "../categories/categories.service";
import { HaRestError } from "../ha/ha-rest.service";
import type { OverlayRepository } from "../overlay/repositories/overlay.repository";
import { EditorService } from "./editor.service";
import { firstFreeKey, scriptKeyFor } from "./flow-key";
import { FlowsService } from "./flows.service";
import type { EditorRepository, FindEntityIdOptions } from "./repositories/editor.repository";
import type { VersionsService } from "src/versions/versions.service";

/** Versions are not under test here; saving must work without them. */
const noVersions = {
  recordSaved: () => Promise.resolve(),
  recordRename: () => Promise.resolve(),
  prepareDelete: () => Promise.resolve(null),
  markDeleted: () => Promise.resolve(),
} as unknown as VersionsService;

const NOW = 1_763_600_000_000;

function setup(overrides: Partial<EditorRepository> = {}) {
  const saveConfig = jest.fn().mockResolvedValue(undefined);
  const deleteConfig = jest.fn().mockResolvedValue(undefined);
  const repository: EditorRepository = {
    loadCatalogSources: jest.fn(),
    loadConfig: jest.fn().mockResolvedValue({ id: "17", alias: "Alt", triggers: [] }),
    loadStates: jest.fn().mockResolvedValue([]),
    loadStorageKey: jest.fn().mockResolvedValue("17"),
    loadStoredConfig: jest.fn().mockResolvedValue(null),
    saveConfig,
    deleteConfig,
    findEntityId: jest.fn().mockResolvedValue("automation.neu"),
    loadCategoryId: jest.fn().mockResolvedValue("cat-1"),
    ...overrides,
  };
  const categories = {
    assign: jest.fn().mockResolvedValue(undefined),
    cleanUp: jest.fn().mockResolvedValue(undefined),
  };
  const overlay = { update: jest.fn().mockResolvedValue(undefined) };
  const service = new FlowsService(
    repository,
    new EditorService(repository, noVersions),
    categories as unknown as CategoriesService,
    overlay as unknown as OverlayRepository,
    () => Promise.resolve(),
    () => NOW,
    noVersions,
  );

  return { service, saveConfig, deleteConfig, categories, overlay };
}

describe("scriptKeyFor and firstFreeKey", () => {
  it("makes keys from names like HA does", () => {
    expect(scriptKeyFor("Gute Nacht – Wohnzimmer")).toBe("gute_nacht_wohnzimmer");
    expect(scriptKeyFor("Größe ändern")).toBe("groesse_aendern");
    expect(scriptKeyFor("Café")).toBe("cafe");
    expect(scriptKeyFor("!!!")).toBe("script");
  });

  it("adds _2, _3, … while a key is taken", async () => {
    const taken = new Set(["licht", "licht_2"]);

    await expect(
      firstFreeKey({ base: "licht", isTaken: (key) => Promise.resolve(taken.has(key)) }),
    ).resolves.toBe("licht_3");
  });
});

describe("FlowsService", () => {
  beforeAll(() => {
    Logger.overrideLogger(false);
  });

  it("creates an empty automation with a time-based id and sorts it into the folder", async () => {
    const { service, saveConfig, categories } = setup();

    await expect(
      service.create({
        dto: { kind: "automation", name: " Licht Flur ", categoryPath: "Haus/Flur" },
      }),
    ).resolves.toEqual({ entityId: "automation.neu" });

    expect(saveConfig).toHaveBeenCalledWith({
      kind: "automation",
      key: String(NOW),
      config: {
        id: String(NOW),
        alias: "Licht Flur",
        description: "",
        triggers: [],
        conditions: [],
        actions: [],
        mode: "single",
      },
    });
    expect(categories.assign).toHaveBeenCalledWith({
      entityId: "automation.neu",
      scope: "automation",
      currentCategoryId: null,
      targetPath: "Haus/Flur",
    });
  });

  it("creates a script under a free key", async () => {
    const findEntityId = jest.fn(({ key }: FindEntityIdOptions) =>
      Promise.resolve(key === "gute_nacht" ? "script.gute_nacht" : null),
    );
    const { service, saveConfig } = setup({ findEntityId });

    await service.create({ dto: { kind: "script", name: "Gute Nacht" } });

    expect(saveConfig).toHaveBeenCalledWith({
      kind: "script",
      key: "gute_nacht_2",
      config: {
        alias: "Gute Nacht",
        sequence: [],
        mode: "single",
      },
    });
  });

  it("turns HA's rejection into FLOW_INVALID", async () => {
    const { service } = setup({
      saveConfig: jest.fn().mockRejectedValue(new HaRestError(400, "Message malformed: x")),
    });

    await expect(service.create({ dto: { kind: "automation", name: "A" } })).rejects.toMatchObject({
      response: { message: "FLOW_INVALID" },
    });
  });

  it("deletes a stored flow, its extras and its empty category", async () => {
    const { service, deleteConfig, categories, overlay } = setup({
      loadStoredConfig: jest.fn().mockResolvedValue({ id: "17" }),
    });

    await service.delete("automation.alt");

    expect(deleteConfig).toHaveBeenCalledWith({ kind: "automation", key: "17" });
    expect(overlay.update).toHaveBeenCalled();
    expect(categories.cleanUp).toHaveBeenCalledWith({ scope: "automation", categoryId: "cat-1" });
  });

  it("refuses to delete flows outside automations.yaml / scripts.yaml", async () => {
    const { service, deleteConfig } = setup();

    await expect(service.delete("automation.alt")).rejects.toMatchObject({
      response: { message: "FLOW_NOT_EDITABLE" },
    });
    expect(deleteConfig).not.toHaveBeenCalled();
  });
});
