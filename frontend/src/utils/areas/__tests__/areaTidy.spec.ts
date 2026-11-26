import { describe, expect, it } from "vitest";

import type { EntryAreaLink } from "@/services/entryAreasService";
import type { Entry } from "@/types/entry";

import { areaNote } from "../areaNotes";
import { folderForArea, planAreaTidy, type TidyInput } from "../areaTidy";

function entry(entityId: string, categoryPath: string | null = null, isInRegistry = true): Entry {
  return { entityId, name: entityId, categoryPath, isInRegistry } as Entry;
}

const link = (areaId: string, name: string): EntryAreaLink => ({
  areaId,
  name,
  source: "uses",
  via: null,
});

const LINKS: Record<string, EntryAreaLink[]> = {
  "automation.a": [link("terrace", "Terrasse")],
  "automation.b": [link("garden", "Garten"), link("terrace", "Terrasse")],
  "automation.c": [link("terrace", "Terrasse")],
  "automation.yaml": [link("terrace", "Terrasse")],
};

const base: TidyInput = {
  entries: [
    entry("automation.a"),
    entry("automation.b"),
    entry("automation.c", "Haus/Terrasse"),
    entry("automation.none"),
    entry("automation.yaml", null, false),
  ],
  linksOf: (entityId) => LINKS[entityId] ?? [],
  folderPaths: ["Haus", "Haus/Terrasse", "Licht"],
  isOnlyUncategorized: true,
  picks: {},
};

describe("folderForArea", () => {
  it("uses an existing folder with the area's name, also a deeper one", () => {
    expect(folderForArea("Terrasse", ["Haus", "Haus/Terrasse"])).toBe("Haus/Terrasse");
    expect(folderForArea("terrasse", ["Terrasse", "Haus/Terrasse"])).toBe("Terrasse");
  });

  it("makes a new top-level folder otherwise", () => {
    expect(folderForArea("Garten", ["Haus", "Haus/Gartenhaus"])).toBe("Garten");
  });
});

describe("planAreaTidy", () => {
  it("moves entries without a folder into the folder of their first area", () => {
    const moves = planAreaTidy(base);

    expect(moves.map((move) => [move.entry.entityId, move.to, move.isNewFolder])).toEqual([
      ["automation.a", "Haus/Terrasse", false],
      ["automation.b", "Garten", true],
    ]);
  });

  it("follows the area the user picked", () => {
    const moves = planAreaTidy({ ...base, picks: { "automation.b": "terrace" } });

    expect(moves.find((move) => move.entry.entityId === "automation.b")?.to).toBe("Haus/Terrasse");
  });

  it("can also re-sort entries in other folders, but skips those already right", () => {
    const moves = planAreaTidy({
      ...base,
      entries: [...base.entries, entry("automation.d", "Licht")],
      linksOf: (entityId) =>
        entityId === "automation.d" ? [link("garden", "Garten")] : (LINKS[entityId] ?? []),
      isOnlyUncategorized: false,
    });

    expect(moves.map((move) => move.entry.entityId)).toEqual([
      "automation.a",
      "automation.b",
      "automation.d",
    ]);
  });
});

describe("areaNote", () => {
  const texts = {
    via: (source: string, name: string) => `${source}:${name}`,
    alsoIn: (names: string) => `also ${names}`,
  };
  const links: EntryAreaLink[] = [
    {
      areaId: "terrace",
      name: "Terrasse",
      source: "uses",
      via: { entityId: "light.t", name: "Lamp" },
    },
    {
      areaId: "garden",
      name: "Garten",
      source: "uses",
      via: { entityId: "light.g", name: "Path" },
    },
  ];

  it("says through what the entry is here and where else it is", () => {
    expect(areaNote(links, "terrace", texts)).toBe("uses:Lamp · also Garten");
  });

  it("says nothing for the own area", () => {
    expect(
      areaNote(
        [{ areaId: "terrace", name: "Terrasse", source: "own", via: null }],
        "terrace",
        texts,
      ),
    ).toBe("");
  });
});
