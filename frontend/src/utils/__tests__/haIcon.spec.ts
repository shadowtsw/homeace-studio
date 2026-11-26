import { describe, expect, it } from "vitest";

import { mdiNamesFromStyleSheets, parseHaIcon, searchIcons } from "../haIcon";

describe("parseHaIcon", () => {
  it("splits pack and name", () => {
    expect(parseHaIcon("phu:wallbox")).toEqual({ pack: "phu", name: "wallbox" });
    expect(parseHaIcon(" mdi:lamp-outline ")).toEqual({ pack: "mdi", name: "lamp-outline" });
  });

  it("refuses values without pack or name", () => {
    expect(parseHaIcon("lamp")).toBeNull();
    expect(parseHaIcon(":lamp")).toBeNull();
    expect(parseHaIcon("mdi:")).toBeNull();
    expect(parseHaIcon(null)).toBeNull();
  });
});

describe("mdiNamesFromStyleSheets", () => {
  it("reads the icon rules of the font stylesheet, sorted and once each", () => {
    const sheet = (...selectors: string[]) => ({
      cssRules: selectors.map((selectorText) => ({ selectorText })),
    });

    expect(
      mdiNamesFromStyleSheets([
        sheet(".mdi-lamp::before", ".mdi-ab-testing::before", ".mdi:before", ".mdi-spin"),
        sheet(".mdi-lamp::before", ".other"),
        { cssRules: [{}] },
      ]),
    ).toEqual(["ab-testing", "lamp"]);
  });

  it("skips a stylesheet it may not read", () => {
    const foreign = {
      get cssRules(): never {
        throw new Error("SecurityError");
      },
    };

    expect(mdiNamesFromStyleSheets([foreign])).toEqual([]);
  });
});

describe("searchIcons", () => {
  const icons = ["phu:floor-lamp", "mdi:lamp", "mdi:desk-lamp", "mdi:fan"];

  it("needs every word, in any order", () => {
    expect(searchIcons({ icons, query: "lamp", pack: null })).toEqual([
      "phu:floor-lamp",
      "mdi:lamp",
      "mdi:desk-lamp",
    ]);
    expect(searchIcons({ icons, query: "lamp desk", pack: null })).toEqual(["mdi:desk-lamp"]);
  });

  it("shows one pack only, and everything for an empty query", () => {
    expect(searchIcons({ icons, query: "lamp", pack: "phu" })).toEqual(["phu:floor-lamp"]);
    expect(searchIcons({ icons, query: " ", pack: null })).toEqual(icons);
  });
});
