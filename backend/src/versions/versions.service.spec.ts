import { BadRequestException, NotFoundException } from "@nestjs/common";

import type { HaConnectionService, HaSubscribeOptions } from "../ha/ha-connection.service";
import { MemoryVersionsRepository } from "./repositories/memory-versions.repository";
import type { VersionTargetRepository } from "./repositories/version-target.repository";
import { MAX_NAMED_VERSIONS, RELOAD_SETTLE_MS } from "./versions.constants";
import { VERSION_SOURCE, type VersionRef } from "./versions.model";
import { VersionsService } from "./versions.service";

const T0 = Date.UTC(2026, 10, 27, 20, 0);
const MINUTE = 60_000;
const FLUR: VersionRef = { kind: "automation", key: "1700", entityId: "automation.flur" };

/** HA's stored configs, as the config API returns them. */
class FakeTarget implements VersionTargetRepository {
  readonly configs = new Map<string, Record<string, unknown>>();
  readonly saved: Record<string, unknown>[] = [];
  refs: VersionRef[] = [FLUR];

  resolveRef(entityId: string): Promise<VersionRef | null> {
    return Promise.resolve(this.refs.find((ref) => ref.entityId === entityId) ?? null);
  }

  listRefs(): Promise<VersionRef[]> {
    return Promise.resolve(this.refs);
  }

  loadStoredConfig(ref: VersionRef): Promise<Record<string, unknown> | null> {
    return Promise.resolve(this.configs.get(ref.key) ?? null);
  }

  saveStoredConfig({
    ref,
    config,
  }: {
    ref: VersionRef;
    config: Record<string, unknown>;
  }): Promise<void> {
    this.saved.push(config);
    this.configs.set(ref.key, config);
    return Promise.resolve();
  }
}

function setup() {
  const clock = { now: T0 };
  const target = new FakeTarget();
  const repository = new MemoryVersionsRepository();
  const subscriptions: HaSubscribeOptions[] = [];
  const ha = {
    subscribe: (options: HaSubscribeOptions) => subscriptions.push(options),
  } as unknown as HaConnectionService;
  const service = new VersionsService(repository, target, () => clock.now, ha);
  service.onModuleInit();
  target.configs.set(FLUR.key, { id: "1700", alias: "Flur", brightness: 80 });

  return { service, target, repository, clock, subscriptions };
}

describe("VersionsService", () => {
  it("gives an entry it has not seen its first version when listed", async () => {
    const { service } = setup();

    const view = await service.list(FLUR.entityId);

    expect(view.versions).toHaveLength(1);
    expect(view.versions[0]).toMatchObject({
      source: VERSION_SOURCE.base,
      config: { brightness: 80 },
    });
    expect(view.openVersionId).toBeNull();
  });

  it("refuses entries that keep no versions", async () => {
    const { service } = setup();

    await expect(service.list("input_boolean.gast")).rejects.toBeInstanceOf(NotFoundException);
  });

  it("keeps a save in HomeAce Studio with its user, as HA stored it", async () => {
    const { service, target, clock } = setup();
    await service.list(FLUR.entityId);

    clock.now = T0 + MINUTE;
    target.configs.set(FLUR.key, { id: "1700", alias: "Flur", brightness: 60 });
    await service.recordSaved({ entityId: FLUR.entityId, user: { id: "u1", name: "Tim" } });

    const view = await service.list(FLUR.entityId);
    expect(view.versions.at(-1)).toMatchObject({
      source: VERSION_SOURCE.homeace,
      user: { id: "u1", name: "Tim" },
      config: { brightness: 60 },
    });
    expect(view.openVersionId).toBe(view.versions.at(-1)?.id);
  });

  it("does not call HomeAce Studio's own save a change from outside", async () => {
    const { service, target, clock } = setup();
    await service.list(FLUR.entityId);
    target.configs.set(FLUR.key, { id: "1700", alias: "Flur", brightness: 60 });
    await service.recordSaved({ entityId: FLUR.entityId });

    clock.now = T0 + 5_000;
    await service.compareAll(VERSION_SOURCE.outside);

    const view = await service.list(FLUR.entityId);
    expect(view.versions.map((version) => version.source)).toEqual([
      VERSION_SOURCE.base,
      VERSION_SOURCE.homeace,
    ]);
  });

  it("keeps a change from outside as its own version", async () => {
    const { service, target, clock } = setup();
    await service.list(FLUR.entityId);

    clock.now = T0 + 10 * MINUTE;
    target.configs.set(FLUR.key, { id: "1700", alias: "Flur", brightness: 30 });
    await service.compareAll(VERSION_SOURCE.outside);

    const view = await service.list(FLUR.entityId);
    expect(view.versions.at(-1)).toMatchObject({
      source: VERSION_SOURCE.outside,
      config: { brightness: 30 },
    });
  });

  it("dates a change while it was not running between the last compare and now", async () => {
    const { service, target, clock } = setup();
    await service.compareAll(VERSION_SOURCE.offline);
    const lastSeen = new Date(T0).toISOString();

    clock.now = T0 + 60 * MINUTE;
    target.configs.set(FLUR.key, { id: "1700", alias: "Flur", brightness: 10 });
    await service.compareAll(VERSION_SOURCE.offline);

    const view = await service.list(FLUR.entityId);
    expect(view.versions.map((version) => version.source)).toEqual([
      VERSION_SOURCE.base,
      VERSION_SOURCE.offline,
    ]);
    expect(view.versions[1].since).toBe(lastSeen);
  });

  it("compares again after HA reports a reload", async () => {
    jest.useFakeTimers();
    try {
      const { service, target, clock, subscriptions } = setup();
      await service.list(FLUR.entityId);
      clock.now = T0 + 10 * MINUTE;
      target.configs.set(FLUR.key, { id: "1700", alias: "Flur", brightness: 5 });

      const callService = subscriptions.find((item) => item.eventType === "call_service");
      callService?.handler({
        event_type: "call_service",
        data: { domain: "automation", service: "reload" },
      });
      await jest.advanceTimersByTimeAsync(RELOAD_SETTLE_MS);
      await service.compareAll(VERSION_SOURCE.outside);

      const view = await service.list(FLUR.entityId);
      expect(view.versions.at(-1)).toMatchObject({
        source: VERSION_SOURCE.outside,
        config: { brightness: 5 },
      });
    } finally {
      jest.useRealTimers();
    }
  });

  it("brings a version back with the id kept and renamed entities replaced", async () => {
    const { service, target, repository, clock } = setup();
    target.configs.set(FLUR.key, {
      id: "1700",
      alias: "Flur",
      action: [{ target: { entity_id: "light.flur" } }],
    });
    const first = await service.list(FLUR.entityId);

    clock.now = T0 + MINUTE;
    await repository.addRename({
      from: "light.flur",
      to: "light.flur_decke",
      at: new Date(clock.now).toISOString(),
    });
    target.configs.set(FLUR.key, { id: "1700", alias: "Flur neu", action: [] });
    clock.now = T0 + 20 * MINUTE;
    await service.compareAll(VERSION_SOURCE.outside);

    clock.now = T0 + 30 * MINUTE;
    const result = await service.restore({
      entityId: FLUR.entityId,
      versionId: first.versions[0].id,
    });

    expect(target.saved.at(-1)).toEqual({
      id: "1700",
      alias: "Flur",
      action: [{ target: { entity_id: "light.flur_decke" } }],
    });
    expect(result.renamed.map((rename) => rename.to)).toEqual(["light.flur_decke"]);
    expect(result.versions.map((version) => version.source)).toEqual([
      VERSION_SOURCE.base,
      VERSION_SOURCE.outside,
      VERSION_SOURCE.restore,
    ]);
    expect(result.versions.at(-1)?.restoredFrom?.id).toBe(first.versions[0].id);
  });

  it("names versions up to the limit and refuses unknown ones", async () => {
    const { service, target, clock } = setup();
    await service.list(FLUR.entityId);
    for (let step = 1; step <= MAX_NAMED_VERSIONS; step++) {
      clock.now = T0 + step * MINUTE;
      target.configs.set(FLUR.key, { id: "1700", alias: "Flur", brightness: step });
      await service.compareAll(VERSION_SOURCE.outside);
    }
    const view = await service.list(FLUR.entityId);
    for (const version of view.versions.slice(0, MAX_NAMED_VERSIONS)) {
      await service.name({
        entityId: FLUR.entityId,
        versionId: version.id,
        name: `Stand ${version.id}`,
      });
    }

    const lastId = view.versions.at(-1)?.id ?? "";
    await expect(
      service.name({ entityId: FLUR.entityId, versionId: lastId, name: "einer zu viel" }),
    ).rejects.toBeInstanceOf(BadRequestException);
    await expect(
      service.name({ entityId: FLUR.entityId, versionId: "gibt-es-nicht", name: "x" }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it("closes the open version on request", async () => {
    const { service, target } = setup();
    await service.list(FLUR.entityId);
    target.configs.set(FLUR.key, { id: "1700", alias: "Flur", brightness: 70 });
    await service.recordSaved({ entityId: FLUR.entityId });

    const view = await service.closeOpen(FLUR.entityId);

    expect(view.openVersionId).toBeNull();
  });
});
