import { describe, expect, it } from "vitest";

import { compareVersions, parseVersion } from "@/utils/whatsNew/version";

describe("parseVersion", () => {
  it("reads release versions, also with a suffix", () => {
    expect(parseVersion("0.14.0")).toEqual([0, 14, 0]);
    expect(parseVersion("1.2.10-beta.1")).toEqual([1, 2, 10]);
  });

  it("gives null for test builds and anything else", () => {
    expect(parseVersion("local")).toBeNull();
    expect(parseVersion("dev")).toBeNull();
    expect(parseVersion("1.2")).toBeNull();
  });
});

describe("compareVersions", () => {
  it("compares numbers, not text", () => {
    expect(compareVersions("0.10.0", "0.9.1")).toBeGreaterThan(0);
    expect(compareVersions("0.13.0", "0.14.0")).toBeLessThan(0);
    expect(compareVersions("0.14.0", "0.14.0")).toBe(0);
  });

  it("puts versions that are no release before every release", () => {
    expect(compareVersions("local", "0.1.0")).toBeLessThan(0);
    expect(compareVersions("0.1.0", "dev")).toBeGreaterThan(0);
    expect(compareVersions("local", "dev")).toBe(0);
  });
});
