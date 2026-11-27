import { BadRequestException, Logger } from "@nestjs/common";

import { HaRestError } from "../ha/ha-rest.service";
import type { CatalogSources } from "./catalog.mapper";
import { CATALOG_CACHE_MS } from "./editor.constants";
import { EditorService } from "./editor.service";
import type { EditorRepository } from "./repositories/editor.repository";
import type { VersionsService } from "src/versions/versions.service";

/** Versions are not under test here; saving must work without them. */
const noVersions = {
  recordSaved: () => Promise.resolve(),
  recordRename: () => Promise.resolve(),
} as unknown as VersionsService;

const SOURCES: CatalogSources = {
  triggers: { "button.pressed": { fields: {}, target: null } },
  conditions: {},
  services: {},
  translations: {
    triggers: { "component.button.triggers.pressed.name": "Taste gedrückt" },
    conditions: {},
    services: {},
  },
};

const CONFIG = {
  id: "1718034411822",
  alias: "Licht",
  triggers: [{ trigger: "button.pressed", target: { entity_id: "input_button.licht" } }],
};

function setup(overrides: Partial<EditorRepository> = {}) {
  const loadCatalogSources = jest.fn().mockResolvedValue(SOURCES);
  const loadConfig = jest.fn().mockResolvedValue(CONFIG);
  const loadStorageKey = jest.fn().mockResolvedValue("1718034411822");
  const loadStoredConfig = jest.fn().mockResolvedValue(CONFIG);
  const saveConfig = jest.fn().mockResolvedValue(undefined);
  const repository: EditorRepository = {
    loadCatalogSources,
    loadConfig,
    loadStates: jest
      .fn()
      .mockResolvedValue([
        { entity_id: "input_button.licht", state: "", attributes: { friendly_name: "Licht aus" } },
      ]),
    loadStorageKey,
    loadStoredConfig,
    saveConfig,
    deleteConfig: jest.fn().mockResolvedValue(undefined),
    findEntityId: jest.fn().mockResolvedValue(null),
    loadCategoryId: jest.fn().mockResolvedValue(null),
    ...overrides,
  };

  return {
    service: new EditorService(repository, noVersions),
    loadCatalogSources,
    loadConfig,
    saveConfig,
  };
}

describe("EditorService", () => {
  beforeAll(() => {
    Logger.overrideLogger(false);
  });

  it("builds the catalog once and serves it from the cache until it expires", async () => {
    const { service, loadCatalogSources } = setup();

    const first = await service.getCatalog({ language: "de", now: 0 });
    await service.getCatalog({ language: "de", now: CATALOG_CACHE_MS - 1 });
    await service.getCatalog({ language: "de", now: CATALOG_CACHE_MS + 1 });

    expect(first.triggers["button.pressed"]?.name).toBe("Taste gedrückt");
    expect(loadCatalogSources).toHaveBeenCalledTimes(2);
  });

  it("falls back to German for unsupported languages", async () => {
    const { service, loadCatalogSources } = setup();

    await service.getCatalog({ language: "it" });

    expect(loadCatalogSources).toHaveBeenCalledWith("de");
  });

  it("returns the config of an automation with the names of its entities", async () => {
    const { service, loadConfig } = setup();

    const flow = await service.getFlow("automation.licht");

    expect(loadConfig).toHaveBeenCalledWith({ kind: "automation", entityId: "automation.licht" });
    expect(flow.entityNames).toEqual({ "input_button.licht": "Licht aus" });
    expect(flow.isEditable).toBe(true);
  });

  it("marks flows outside automations.yaml / scripts.yaml as read-only", async () => {
    const { service } = setup({ loadStoredConfig: jest.fn().mockResolvedValue(null) });

    await expect(service.getFlow("automation.licht")).resolves.toMatchObject({
      isEditable: false,
    });
  });

  it("marks flows without a storage key or from a blueprint as read-only", async () => {
    const withoutKey = setup({ loadStorageKey: jest.fn().mockResolvedValue(null) });
    const fromBlueprint = setup({
      loadConfig: jest.fn().mockResolvedValue({ id: "1", use_blueprint: { path: "x.yaml" } }),
    });

    await expect(withoutKey.service.getFlow("automation.licht")).resolves.toMatchObject({
      isEditable: false,
    });
    await expect(fromBlueprint.service.getFlow("automation.licht")).resolves.toMatchObject({
      isEditable: false,
    });
  });

  it("refuses entries that have no flow", async () => {
    const { service } = setup();

    await expect(service.getFlow("scene.kino")).rejects.toBeInstanceOf(BadRequestException);
  });

  it("saves the whole config under its key and keeps the automation id", async () => {
    const { service, saveConfig } = setup();
    const edited = { ...CONFIG, id: "changed", alias: "Licht neu", unknown_field: { a: 1 } };

    const flow = await service.saveFlow({ entityId: "automation.licht", config: edited });

    expect(saveConfig).toHaveBeenCalledWith({
      kind: "automation",
      key: "1718034411822",
      config: {
        ...edited,
        id: "1718034411822",
      },
    });
    expect(flow.config).toMatchObject({ alias: "Licht neu", unknown_field: { a: 1 } });
    expect(flow.isEditable).toBe(true);
  });

  it("saves scripts without adding an id", async () => {
    const script = { alias: "Gute Nacht", sequence: [] };
    const { service, saveConfig } = setup({
      loadConfig: jest.fn().mockResolvedValue(script),
      loadStorageKey: jest.fn().mockResolvedValue("gute_nacht"),
    });

    await service.saveFlow({ entityId: "script.gute_nacht", config: script });

    expect(saveConfig).toHaveBeenCalledWith({ kind: "script", key: "gute_nacht", config: script });
  });

  it("refuses to save flows HA does not keep in its files", async () => {
    const { service, saveConfig } = setup({ loadStoredConfig: jest.fn().mockResolvedValue(null) });

    await expect(
      service.saveFlow({ entityId: "automation.licht", config: CONFIG }),
    ).rejects.toMatchObject({
      response: { message: "FLOW_NOT_EDITABLE" },
    });
    expect(saveConfig).not.toHaveBeenCalled();
  });

  it("turns a rejection by HA into FLOW_INVALID with HA's reason", async () => {
    const { service } = setup({
      saveConfig: jest
        .fn()
        .mockRejectedValue(new HaRestError(400, "Message malformed: required key not provided")),
    });

    await expect(
      service.saveFlow({ entityId: "automation.licht", config: CONFIG }),
    ).rejects.toMatchObject({
      response: {
        message: "FLOW_INVALID",
        params: { reason: "Message malformed: required key not provided" },
      },
    });
  });
});
