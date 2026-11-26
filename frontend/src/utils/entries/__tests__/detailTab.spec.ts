import { describe, expect, it } from "vitest";

import { startTab } from "../detailTab";

const AUTOMATION = ["flow", "properties", "history", "dependencies"] as const;
const HELPER = ["settings", "properties", "dependencies"] as const;

describe("startTab", () => {
  it("starts on the first tab without a picked tab", () => {
    expect(startTab({ tabs: AUTOMATION, preferred: null })).toBe("flow");
  });

  it("keeps the picked tab when the entry has it", () => {
    expect(startTab({ tabs: AUTOMATION, preferred: "history" })).toBe("history");
    expect(startTab({ tabs: HELPER, preferred: "dependencies" })).toBe("dependencies");
  });

  it("falls back to the first tab when the entry lacks the picked tab", () => {
    expect(startTab<string>({ tabs: HELPER, preferred: "history" })).toBe("settings");
    expect(startTab<string>({ tabs: AUTOMATION, preferred: "settings" })).toBe("flow");
  });

  it("returns null without tabs", () => {
    expect(startTab({ tabs: [], preferred: "flow" })).toBeNull();
  });
});
