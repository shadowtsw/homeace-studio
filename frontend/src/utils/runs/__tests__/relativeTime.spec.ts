import { describe, expect, it } from "vitest";

import { relativeTime } from "../relativeTime";

const NOW = new Date("2026-11-20T12:00:00Z");

describe("relative time", () => {
  it("uses the largest unit that fits", () => {
    expect(relativeTime("2026-11-17T12:00:00Z", NOW, "de")).toBe("vor 3 Tagen");
    expect(relativeTime("2026-06-20T12:00:00Z", NOW, "en")).toBe("5 months ago");
    expect(relativeTime("2026-11-20T11:58:00Z", NOW, "en")).toBe("2 minutes ago");
  });
});
