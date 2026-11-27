import { mkdtemp, readdir, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import type { VersionRef } from "../versions.model";
import { FileVersionsRepository } from "./file-versions.repository";

const REF: VersionRef = {
  kind: "automation",
  key: "id/with ../odd chars",
  entityId: "automation.x",
};

describe("FileVersionsRepository", () => {
  let dir: string;

  beforeEach(async () => {
    dir = await mkdtemp(join(tmpdir(), "homeace-versions-"));
  });

  afterEach(async () => {
    await rm(dir, { recursive: true, force: true });
  });

  it("keeps a history gzipped, in one file per entry, whatever the storage key", async () => {
    const repository = new FileVersionsRepository(dir);

    await repository.update({
      ref: REF,
      change: (history) => ({
        ...history,
        versions: [
          { id: "v1", at: "2026-11-27T20:00:00.000Z", source: "base", config: { alias: "x" } },
        ],
      }),
    });

    const files = await readdir(dir);
    expect(files).toHaveLength(1);
    expect(files[0]).toMatch(/^automation-[A-Za-z0-9_-]+\.json\.gz$/);
    expect((await new FileVersionsRepository(dir).read(REF))?.versions[0].config).toEqual({
      alias: "x",
    });
  });

  it("runs changes of the same entry one after another", async () => {
    const repository = new FileVersionsRepository(dir);
    const append = (id: string) =>
      repository.update({
        ref: REF,
        change: (history) => ({
          ...history,
          versions: [
            ...history.versions,
            { id, at: "2026-11-27T20:00:00.000Z", source: "outside" as const, config: {} },
          ],
        }),
      });

    await Promise.all([append("a"), append("b"), append("c")]);

    expect((await repository.read(REF))?.versions.map((version) => version.id)).toEqual([
      "a",
      "b",
      "c",
    ]);
  });

  it("returns null without a history and keeps renames and the last compare", async () => {
    const repository = new FileVersionsRepository(dir);

    expect(await repository.read(REF)).toBeNull();
    expect(await repository.readLastSeen()).toBeNull();

    await repository.addRename({ from: "light.a", to: "light.b", at: "2026-11-27T20:00:00.000Z" });
    await repository.writeLastSeen("2026-11-27T21:00:00.000Z");

    expect(await repository.readRenames()).toEqual([
      { from: "light.a", to: "light.b", at: "2026-11-27T20:00:00.000Z" },
    ]);
    expect(await repository.readLastSeen()).toBe("2026-11-27T21:00:00.000Z");
  });
  it("lists the entries it keeps and removes one for good", async () => {
    const repository = new FileVersionsRepository(dir);
    await repository.update({ ref: REF, change: (history) => history });
    await repository.writeLastSeen("2026-11-27T21:00:00.000Z");

    expect(await repository.listKeys()).toEqual([{ kind: "automation", key: REF.key }]);

    await repository.remove(REF);
    expect(await repository.listKeys()).toEqual([]);
    expect(await repository.read(REF)).toBeNull();
  });
});
