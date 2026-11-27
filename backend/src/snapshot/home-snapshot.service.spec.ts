import type { EditorRepository } from "../editor/repositories/editor.repository";
import type { EntriesService } from "../entries/entries.service";
import type { HaConnectionService } from "../ha/ha-connection.service";
import { HA_COMMAND } from "../ha/ha.constants";
import type { HaArea } from "../ha/ha.types";
import { LiveService } from "../live/live.service";
import { HomeSnapshotService, type HomeSnapshot } from "./home-snapshot.service";

type Deferred = { promise: Promise<HaArea[]>; resolve: (areas: HaArea[]) => void };

function deferred(): Deferred {
  let resolve: (areas: HaArea[]) => void = () => undefined;
  const promise = new Promise<HaArea[]>((done) => (resolve = done));

  return { promise, resolve };
}

const area = (id: string): HaArea => ({ area_id: id, name: id }) as HaArea;
const areaIds = (snapshot: HomeSnapshot): string[] => snapshot.areas.map((item) => item.area_id);

/** A snapshot over an empty home whose areas the test sets or holds back. */
function setup() {
  let areas: HaArea[] = [];
  const held: Deferred[] = [];
  const ha = {
    call: ({ type }: { type: string }) => {
      if (type !== HA_COMMAND.areaRegistryList) return Promise.resolve([]);
      return held.shift()?.promise ?? Promise.resolve(areas);
    },
  } as unknown as HaConnectionService;
  const entries = { findAll: () => Promise.resolve([]) } as unknown as EntriesService;
  const editor = { loadStates: () => Promise.resolve([]) } as unknown as EditorRepository;
  const live = new LiveService(ha);
  const snapshots = new HomeSnapshotService(entries, ha, editor, () => 0, live);
  snapshots.onModuleInit();

  return {
    snapshots,
    live,
    setAreas: (next: HaArea[]) => (areas = next),
    /** The next read of the areas waits until the test resolves it. */
    holdAreas: (): Deferred => {
      const next = deferred();
      held.push(next);
      return next;
    },
  };
}

describe("HomeSnapshotService", () => {
  it("shares a snapshot and reads again at once after a change, not only after the burst", async () => {
    const { snapshots, live, setAreas } = setup();
    setAreas([area("kitchen")]);
    expect(areaIds(await snapshots.get())).toEqual(["kitchen"]);

    setAreas([]);
    expect(areaIds(await snapshots.get())).toEqual(["kitchen"]);

    live.notify();
    expect(areaIds(await snapshots.get())).toEqual([]);
  });

  it("neither keeps nor shares a read that started before a change", async () => {
    const { snapshots, live, holdAreas } = setup();
    const first = holdAreas();
    const before = snapshots.get();

    live.notify();
    const second = holdAreas();
    const after = snapshots.get();
    first.resolve([area("old")]);
    second.resolve([area("new")]);

    expect(areaIds(await before)).toEqual(["old"]);
    expect(areaIds(await after)).toEqual(["new"]);
    expect(areaIds(await snapshots.get())).toEqual(["new"]);
  });
});
