import type { CategoriesService } from "../categories/categories.service";
import { HaRestError } from "../ha/ha-rest.service";
import type { SceneRepository } from "./repositories/scene.repository";
import { SceneCreateService } from "./scene-create.service";

const NOW = 1_763_600_000_000;

function setup(overrides: Partial<SceneRepository> = {}) {
  const saveConfig = jest.fn().mockResolvedValue(undefined);
  const repository: SceneRepository = {
    findStorageId: jest.fn(),
    findEntityId: jest.fn().mockResolvedValue("scene.kino"),
    loadConfig: jest.fn(),
    saveConfig,
    loadStates: jest.fn(),
    apply: jest.fn(),
    ...overrides,
  };
  const assign = jest.fn().mockResolvedValue(undefined);
  const categories = { assign } as unknown as CategoriesService;
  const pause = jest.fn().mockResolvedValue(undefined);
  const service = new SceneCreateService(repository, categories, pause, () => NOW);

  return { service, repository, saveConfig, assign, pause };
}

describe("SceneCreateService", () => {
  it("writes an empty scene with the time as id and sorts it into the folder", async () => {
    const { service, saveConfig, assign } = setup();

    const result = await service.create({ name: " Kino ", categoryPath: "Haus/Wohnzimmer" });

    expect(result).toEqual({ entityId: "scene.kino" });
    expect(saveConfig).toHaveBeenCalledWith(String(NOW), {
      id: String(NOW),
      name: "Kino",
      entities: {},
    });
    expect(assign).toHaveBeenCalledWith({
      entityId: "scene.kino",
      scope: "scene",
      currentCategoryId: null,
      targetPath: "Haus/Wohnzimmer",
    });
  });

  it("waits until HA has registered the scene", async () => {
    const findEntityId = jest
      .fn()
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(null)
      .mockResolvedValue("scene.kino");
    const { service, pause, assign } = setup({ findEntityId });

    await expect(service.create({ name: "Kino" })).resolves.toEqual({ entityId: "scene.kino" });
    expect(pause).toHaveBeenCalledTimes(2);
    expect(assign).not.toHaveBeenCalled();
  });

  it("names the likely entity ID when HA does not register it in time", async () => {
    const { service, assign } = setup({ findEntityId: jest.fn().mockResolvedValue(null) });

    await expect(service.create({ name: "Gute Nacht", categoryPath: "X" })).resolves.toEqual({
      entityId: "scene.gute_nacht",
    });
    expect(assign).not.toHaveBeenCalled();
  });

  it("turns HA's refusal into FLOW_INVALID", async () => {
    const saveConfig = jest.fn().mockRejectedValue(new HaRestError(400, "Message malformed"));
    const { service } = setup({ saveConfig });

    await expect(service.create({ name: "Kino" })).rejects.toMatchObject({
      response: { message: "FLOW_INVALID" },
    });
  });
});
