import { describe, expect, it } from "vitest";

import { slugifyName, suggestEntityId } from "../entityId";

describe("slugifyName", () => {
  it("works like HA: accents dropped, ß as ss, the rest as _", () => {
    expect(slugifyName("Gäste kommen!")).toBe("gaste_kommen");
    expect(slugifyName("  Fußweg – Licht  ")).toBe("fussweg_licht");
  });
});

describe("suggestEntityId", () => {
  it("suggests an ID that fits the name", () => {
    expect(suggestEntityId("timer.terrace_light_delay", "Terrace delay")).toBe(
      "timer.terrace_delay",
    );
  });

  it("says nothing when the ID fits or the name gives none", () => {
    expect(suggestEntityId("input_boolean.guest_mode", "Guest mode")).toBeNull();
    expect(suggestEntityId("input_boolean.guest_mode", "!!!")).toBeNull();
  });
});
