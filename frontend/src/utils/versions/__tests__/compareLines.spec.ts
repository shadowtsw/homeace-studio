import { describe, expect, it } from "vitest";

import { alignLines, linesOfScene, summarizeRows, type VersionLine } from "../compareLines";

const line = (
  key: string,
  text: string,
  section: VersionLine["section"] = "action",
): VersionLine => ({
  key,
  section,
  depth: 0,
  icon: "mdi-lightbulb",
  title: key,
  text,
});

describe("alignLines", () => {
  it("pairs equal and changed lines and leaves gaps for removed and added ones", () => {
    const older = [
      line("Bewegung", "erkannt", "trigger"),
      line("Licht", "80 %"),
      line("Warten", "5 min"),
    ];
    const newer = [line("Bewegung", "erkannt", "trigger"), line("Licht", "60 %"), line("Aus", "")];

    const rows = alignLines({ older, newer });

    expect(
      rows.map((row) => [row.section, row.older?.key ?? null, row.newer?.key ?? null, row.change]),
    ).toEqual([
      ["trigger", "Bewegung", "Bewegung", "same"],
      ["action", "Licht", "Licht", "changed"],
      ["action", "Warten", null, "onlyOld"],
      ["action", null, "Aus", "onlyNew"],
    ]);
  });

  it("keeps the same block on one row when another one is inserted before it", () => {
    const older = [line("A", "1"), line("B", "2")];
    const newer = [line("X", "0"), line("A", "1"), line("B", "3")];

    const rows = alignLines({ older, newer });

    expect(rows.map((row) => row.change)).toEqual(["onlyNew", "same", "changed"]);
  });
});

describe("summarizeRows", () => {
  it("names changed lines and counts added and removed ones per section", () => {
    const rows = alignLines({
      older: [line("Licht", "80 %"), line("Warten", "5 min"), line("Tür", "zu", "condition")],
      newer: [line("Licht", "60 %")],
    });

    expect(summarizeRows(rows)).toEqual({
      changed: ["Licht"],
      added: {},
      removed: { condition: 1, action: 1 },
    });
  });
});

describe("linesOfScene", () => {
  it("sorts devices by name and keys them by entity", () => {
    const lines = linesOfScene([
      { entityId: "light.wohn", name: "Wohnzimmer", icon: "mdi-lightbulb", text: "an · 40 %" },
      { entityId: "cover.sued", name: "Rollo Süd", icon: "mdi-blinds", text: "geschlossen" },
    ]);

    expect(lines.map((item) => [item.key, item.section])).toEqual([
      ["cover.sued", "state"],
      ["light.wohn", "state"],
    ]);
  });
});
