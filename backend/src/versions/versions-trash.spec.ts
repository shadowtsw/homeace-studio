import { NotFoundException } from "@nestjs/common";

import type { HaConnectionService } from "../ha/ha-connection.service";
import { MemoryVersionsRepository } from "./repositories/memory-versions.repository";
import type { VersionTargetRepository } from "./repositories/version-target.repository";
import { DAY_MS, TRASH_DAYS } from "./versions.constants";
import { VERSION_SOURCE, type VersionRef } from "./versions.model";
import { VersionsService } from "./versions.service";

const T0 = Date.UTC(2026, 10, 27, 20, 0);
const COFFEE: VersionRef = { kind: "automation", key: "1800", entityId: "automation.coffee" };

/** HA's stored configs and registry; deleting removes both, saving registers again. */
class FakeHa implements VersionTargetRepository {
  readonly configs = new Map<string, Record<string, unknown>>();
  refs: VersionRef[] = [COFFEE];

  resolveRef(entityId: string): Promise<VersionRef | null> {
    return Promise.resolve(this.refs.find((ref) => ref.entityId === entityId) ?? null);
  }

  listRefs(): Promise<VersionRef[]> {
    return Promise.resolve(this.refs);
  }

  waitForEntityId(ref: Pick<VersionRef, "kind" | "key">): Promise<string | null> {
    const found = this.refs.find((item) => item.kind === ref.kind && item.key === ref.key);
    return Promise.resolve(found?.entityId ?? null);
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
    this.configs.set(ref.key, config);
    this.refs = [...this.refs, ref];
    return Promise.resolve();
  }

  remove(ref: VersionRef): void {
    this.configs.delete(ref.key);
    this.refs = this.refs.filter((item) => item.key !== ref.key);
  }
}

function setup() {
  const clock = { now: T0 };
  const ha = new FakeHa();
  ha.configs.set(COFFEE.key, { id: "1800", alias: "Kaffeemaschine morgens", actions: [] });
  const repository = new MemoryVersionsRepository();
  const connection = { subscribe: () => undefined } as unknown as HaConnectionService;
  const service = new VersionsService(repository, ha, () => clock.now, connection);

  return { service, ha, repository, clock };
}

describe("VersionsService trash", () => {
  it("keeps an entry deleted in HomeAce Studio and brings it back with its id", async () => {
    const { service, ha, clock } = setup();
    await service.list(COFFEE.entityId);

    const ref = await service.prepareDelete(COFFEE.entityId);
    ha.remove(COFFEE);
    if (ref) await service.markDeleted({ ref, where: "homeace" });

    clock.now = T0 + 3 * DAY_MS;
    const trash = await service.trash();
    expect(trash).toEqual([
      expect.objectContaining({
        key: "1800",
        name: "Kaffeemaschine morgens",
        where: "homeace",
        daysLeft: TRASH_DAYS - 3,
      }),
    ]);

    const back = await service.restoreFromTrash({ kind: "automation", key: "1800" });

    expect(back).toEqual({ entityId: "automation.coffee", name: "Kaffeemaschine morgens" });
    expect(ha.configs.get("1800")).toMatchObject({ id: "1800", alias: "Kaffeemaschine morgens" });
    expect(await service.trash()).toEqual([]);
    const view = await service.list(COFFEE.entityId);
    expect(view.versions.at(-1)).toMatchObject({ source: VERSION_SOURCE.restore, fromTrash: true });
  });

  it("puts an entry deleted outside HomeAce Studio into the trash on the next compare", async () => {
    const { service, ha } = setup();
    await service.list(COFFEE.entityId);

    ha.remove(COFFEE);
    await service.compareAll(VERSION_SOURCE.outside);

    expect(await service.trash()).toEqual([
      expect.objectContaining({ key: "1800", where: "outside" }),
    ]);
  });

  it("does not call an entry deleted while HA still has its config", async () => {
    const { service, ha } = setup();
    await service.list(COFFEE.entityId);

    // Missing from the registry for a moment (HA starting), but the config is still there.
    ha.refs = [];
    await service.compareAll(VERSION_SOURCE.offline);

    expect(await service.trash()).toEqual([]);
  });

  it("forgets entries after the trash days", async () => {
    const { service, ha, clock } = setup();
    await service.list(COFFEE.entityId);
    ha.remove(COFFEE);
    await service.compareAll(VERSION_SOURCE.outside);

    clock.now = T0 + (TRASH_DAYS + 1) * DAY_MS;
    await service.compareAll(VERSION_SOURCE.outside);

    expect(await service.trash()).toEqual([]);
    await expect(
      service.restoreFromTrash({ kind: "automation", key: "1800" }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });
});
