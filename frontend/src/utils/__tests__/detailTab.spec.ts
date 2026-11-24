import { describe, expect, it } from "vitest";

import { startTab } from "../detailTab";

const AUTOMATION = ["flow", "properties", "history", "dependencies"] as const;
const HELPER = ["settings", "properties", "dependencies"] as const;

describe("startTab", () => {
  it("starts on the first tab without a picked tab", () => {
    expect(startTab(AUTOMATION, null)).toBe("flow");
  });

  it("keeps the picked tab when the entry has it", () => {
    expect(startTab(AUTOMATION, "history")).toBe("history");
    expect(startTab(HELPER, "dependencies")).toBe("dependencies");
  });

  it("falls back to the first tab when the entry lacks the picked tab", () => {
    expect(startTab<string>(HELPER, "history")).toBe("settings");
    expect(startTab<string>(AUTOMATION, "settings")).toBe("flow");
  });

  it("returns null without tabs", () => {
    expect(startTab([], "flow")).toBeNull();
  });
});
