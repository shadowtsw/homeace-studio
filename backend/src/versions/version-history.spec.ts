import {
  addVersion,
  applyRenames,
  cleanVersionName,
  closeOpenVersion,
  isOpen,
  nameVersion,
  sameConfig,
} from "./version-history";
import { MAX_NAMED_VERSIONS, MAX_UNNAMED_VERSIONS, OPEN_VERSION_MS } from "./versions.constants";
import { VERSION_SOURCE, type VersionHistory, type VersionSource } from "./versions.model";

const REF = { kind: "automation" as const, key: "1700", entityId: "automation.flur" };
const T0 = Date.UTC(2026, 10, 27, 20, 0);
const MINUTE = 60_000;

function idsFrom(prefix: string): () => string {
  let next = 0;
  return () => `${prefix}${++next}`;
}

function add(
  history: VersionHistory,
  options: { brightness: number; source: VersionSource; now: number; newId?: () => string },
): VersionHistory {
  return addVersion({
    history,
    config: { alias: "Flur", brightness: options.brightness },
    source: options.source,
    now: options.now,
    newId: options.newId ?? idsFrom("v"),
  });
}

const EMPTY: VersionHistory = { ref: REF, versions: [] };

describe("sameConfig", () => {
  it("ignores the order of keys, not values", () => {
    expect(sameConfig({ a: 1, b: { c: 2, d: 3 } }, { b: { d: 3, c: 2 }, a: 1 })).toBe(true);
    expect(sameConfig({ a: [1, 2] }, { a: [2, 1] })).toBe(false);
  });
});

describe("addVersion", () => {
  it("adds nothing when the config equals the newest version", () => {
    const first = add(EMPTY, { brightness: 80, source: VERSION_SOURCE.base, now: T0 });
    const again = add(first, { brightness: 80, source: VERSION_SOURCE.outside, now: T0 + MINUTE });

    expect(again).toBe(first);
  });

  it("joins saves in HomeAce Studio within the open time into one version", () => {
    const ids = idsFrom("v");
    let history = add(EMPTY, { brightness: 80, source: VERSION_SOURCE.base, now: T0, newId: ids });
    history = add(history, { brightness: 60, source: VERSION_SOURCE.homeace, now: T0, newId: ids });
    history = add(history, {
      brightness: 40,
      source: VERSION_SOURCE.homeace,
      now: T0 + 4 * MINUTE,
      newId: ids,
    });

    expect(history.versions).toHaveLength(2);
    expect(history.versions[1]).toMatchObject({ config: { brightness: 40 }, saves: 2 });
    expect(isOpen({ version: history.versions[1], now: T0 + 9 * MINUTE })).toBe(true);
    expect(isOpen({ version: history.versions[1], now: T0 + OPEN_VERSION_MS })).toBe(false);
  });

  it("starts a new version after the open time and for other sources", () => {
    const ids = idsFrom("v");
    let history = add(EMPTY, {
      brightness: 60,
      source: VERSION_SOURCE.homeace,
      now: T0,
      newId: ids,
    });
    history = add(history, {
      brightness: 50,
      source: VERSION_SOURCE.homeace,
      now: T0 + OPEN_VERSION_MS,
      newId: ids,
    });
    history = add(history, {
      brightness: 30,
      source: VERSION_SOURCE.outside,
      now: T0 + OPEN_VERSION_MS + MINUTE,
      newId: ids,
    });

    expect(history.versions.map((version) => version.source)).toEqual([
      VERSION_SOURCE.homeace,
      VERSION_SOURCE.homeace,
      VERSION_SOURCE.outside,
    ]);
    // Another source closes the open version.
    expect(history.versions[1].openUntil).toBeUndefined();
  });

  it("drops the oldest unnamed versions beyond the limit, never named ones", () => {
    const ids = idsFrom("v");
    let history = add(EMPTY, { brightness: 0, source: VERSION_SOURCE.base, now: T0, newId: ids });
    const named = nameVersion({ history, versionId: "v1", name: "läuft stabil" });
    if (!named.ok) throw new Error("naming failed");
    history = named.history;

    for (let step = 1; step <= MAX_UNNAMED_VERSIONS + 3; step++) {
      history = add(history, {
        brightness: step,
        source: VERSION_SOURCE.outside,
        now: T0 + step * MINUTE,
        newId: ids,
      });
    }

    const unnamed = history.versions.filter((version) => !version.name);
    expect(unnamed).toHaveLength(MAX_UNNAMED_VERSIONS);
    expect(history.versions[0]).toMatchObject({ id: "v1", name: "läuft stabil" });
    expect(unnamed[0].config).toMatchObject({ brightness: 4 });
  });
});

describe("nameVersion", () => {
  it("names, renames and unnames a version", () => {
    const history = add(EMPTY, { brightness: 80, source: VERSION_SOURCE.base, now: T0 });
    const named = nameVersion({ history, versionId: "v1", name: "  läuft stabil " });
    if (!named.ok) throw new Error("naming failed");
    expect(named.history.versions[0].name).toBe("läuft stabil");

    const unnamed = nameVersion({ history: named.history, versionId: "v1", name: null });
    if (!unnamed.ok) throw new Error("unnaming failed");
    expect(unnamed.history.versions[0].name).toBeUndefined();
  });

  it("refuses a name beyond the limit and unknown versions", () => {
    const ids = idsFrom("v");
    let history = EMPTY;
    for (let step = 0; step <= MAX_NAMED_VERSIONS; step++) {
      history = add(history, {
        brightness: step,
        source: VERSION_SOURCE.outside,
        now: T0 + step * MINUTE,
        newId: ids,
      });
    }
    for (let step = 1; step <= MAX_NAMED_VERSIONS; step++) {
      const result = nameVersion({ history, versionId: `v${step}`, name: `Stand ${step}` });
      if (!result.ok) throw new Error("naming failed");
      history = result.history;
    }

    const tooMany = nameVersion({
      history,
      versionId: `v${MAX_NAMED_VERSIONS + 1}`,
      name: "zu viel",
    });
    expect(tooMany).toEqual({ ok: false, reason: "tooManyNamed" });
    expect(nameVersion({ history, versionId: "nope", name: "x" })).toEqual({
      ok: false,
      reason: "notFound",
    });
  });
});

describe("cleanVersionName", () => {
  it("keeps plain text only", () => {
    expect(cleanVersionName("stabil‮esrever\u0007")).toBe("stabilesrever");
    expect(cleanVersionName("x".repeat(60))).toHaveLength(40);
    expect(cleanVersionName(null)).toBe("");
  });
});

describe("closeOpenVersion", () => {
  it("lets the next save start a new version", () => {
    const history = add(EMPTY, { brightness: 80, source: VERSION_SOURCE.homeace, now: T0 });
    const closed = closeOpenVersion(history);

    expect(isOpen({ version: closed.versions[0], now: T0 + MINUTE })).toBe(false);
  });
});

describe("applyRenames", () => {
  it("replaces IDs renamed after the version, following chains", () => {
    const config = {
      action: [{ target: { entity_id: ["light.flur", "light.bad"] } }],
      alias: "light.flur",
    };
    const renames = [
      { from: "light.bad", to: "light.bad_alt", at: "2026-11-01T00:00:00.000Z" },
      { from: "light.flur", to: "light.flur_decke", at: "2026-11-25T00:00:00.000Z" },
      { from: "light.flur_decke", to: "light.flur_oben", at: "2026-11-26T00:00:00.000Z" },
    ];

    const result = applyRenames({ config, renames, since: "2026-11-20T00:00:00.000Z" });

    expect(result.config).toEqual({
      action: [{ target: { entity_id: ["light.flur_oben", "light.bad"] } }],
      alias: "light.flur_oben",
    });
    expect(result.applied.map((rename) => [rename.from, rename.to])).toEqual([
      ["light.flur", "light.flur_oben"],
    ]);
  });
});
