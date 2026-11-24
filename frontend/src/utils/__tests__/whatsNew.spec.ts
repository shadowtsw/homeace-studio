import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import {
  LAST_VERSION_WITHOUT_WHATS_NEW,
  WHATS_NEW,
  type WhatsNewRelease,
} from "@/constants/whatsNew";
import { APP_LOCALES } from "@/i18n";
import { compareVersions, parseVersion } from "@/utils/version";
import {
  currentRelease,
  effectiveVersion,
  initialSeenVersion,
  unseenReleases,
} from "@/utils/whatsNew";

const release = (version: string): WhatsNewRelease => ({ version, items: [] });
const RELEASES = [release("0.16.0"), release("0.15.0"), release("0.14.0")];
const versions = (list: WhatsNewRelease[]): string[] => list.map((item) => item.version);

describe("effectiveVersion", () => {
  it("takes the version of a released image", () => {
    expect(effectiveVersion("0.15.0", RELEASES)).toBe("0.15.0");
  });

  it("shows the newest highlights in a local test build", () => {
    expect(effectiveVersion("local", RELEASES)).toBe("0.16.0");
    expect(effectiveVersion("dev", [])).toBe("dev");
  });
});

describe("unseenReleases", () => {
  it("lists what came after the confirmed version, up to the running one", () => {
    expect(versions(unseenReleases(RELEASES, "0.14.0", "0.16.0"))).toEqual(["0.16.0", "0.15.0"]);
  });

  it("never shows highlights of a version that is not installed yet", () => {
    expect(versions(unseenReleases(RELEASES, "0.13.0", "0.15.0"))).toEqual(["0.15.0", "0.14.0"]);
  });

  it("is empty once the running version is confirmed", () => {
    expect(unseenReleases(RELEASES, "0.16.0", "0.16.0")).toEqual([]);
  });
});

describe("currentRelease", () => {
  it("is the newest release up to the running version", () => {
    expect(currentRelease(RELEASES, "0.15.2")?.version).toBe("0.15.0");
    expect(currentRelease(RELEASES, "0.13.0")).toBeNull();
  });
});

describe("initialSeenVersion", () => {
  it("has nothing to catch up on for a fresh install", () => {
    expect(initialSeenVersion(false, "0.16.0", "0.13.0")).toBe("0.16.0");
  });

  it("shows everything since the last version without the feature to earlier users", () => {
    expect(initialSeenVersion(true, "0.16.0", "0.13.0")).toBe("0.13.0");
  });
});

describe("WHATS_NEW", () => {
  it("has release versions, newest first, each once", () => {
    const list = WHATS_NEW.map((item) => item.version);

    expect(list.every((version) => parseVersion(version))).toBe(true);
    expect(
      list.every((version) => compareVersions(version, LAST_VERSION_WITHOUT_WHATS_NEW) > 0),
    ).toBe(true);
    expect([...list].sort((a, b) => compareVersions(b, a))).toEqual(list);
    expect(new Set(list).size).toBe(list.length);
  });

  it("has 1 to 6 highlights per release, each in every language", () => {
    const problems = WHATS_NEW.flatMap((entry) => [
      ...(entry.items.length < 1 || entry.items.length > 6 ? [`${entry.version}: count`] : []),
      ...entry.items.flatMap((item, index) => [
        ...(item.icon.startsWith("mdi-") ? [] : [`${entry.version}#${index}: icon`]),
        ...APP_LOCALES.filter(
          (locale) => !item.title[locale]?.trim() || !item.text[locale]?.trim(),
        ).map((locale) => `${entry.version}#${index}: ${locale}`),
      ]),
    ]);

    expect(problems).toEqual([]);
  });

  it("has highlights for the version about to be released", () => {
    const config = readFileSync(
      join(__dirname, "..", "..", "..", "..", "homeace-studio", "config.yaml"),
      "utf8",
    );
    const version = /^version:\s*"?([^"\r\n]+)"?/m.exec(config)?.[1] ?? "";

    // Every release after the one without "What's new" needs its highlights (part of the release).
    const needsHighlights = compareVersions(version, LAST_VERSION_WITHOUT_WHATS_NEW) > 0;
    const hasHighlights = WHATS_NEW.some((item) => item.version === version);

    expect({ version, missing: needsHighlights && !hasHighlights }).toEqual({
      version,
      missing: false,
    });
  });
});
