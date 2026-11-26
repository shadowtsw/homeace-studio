import { describe, expect, it } from "vitest";

import { DEFAULT_AREA_ICON, guessAreaIcon } from "../areaIcons";

describe("guessAreaIcon", () => {
  it("knows German and English room words", () => {
    expect(guessAreaIcon("Schlafzimmer Eltern")).toBe("mdi:bed");
    expect(guessAreaIcon("Kitchen")).toBe("mdi:stove");
    expect(guessAreaIcon("Gäste-WC")).toBe("mdi:shower");
    expect(guessAreaIcon("Heizungskeller")).toBe("mdi:tools");
  });

  it("falls back to a house", () => {
    expect(guessAreaIcon("Dachboden")).toBe(DEFAULT_AREA_ICON);
  });
});
