import type { WhatsNewRelease } from "@/constants/whatsNew";
import { compareVersions, parseVersion } from "@/utils/whatsNew/version";

export type EffectiveVersionOptions = {
  appVersion: string;
  /** Newest first. */
  releases: readonly WhatsNewRelease[];
};

/**
 * The version whose highlights count as "current". A released image always has a real version; a
 * local test build ("local", "dev") has none and shows the newest highlights, so they can be tried
 * before the release.
 */
export function effectiveVersion({ appVersion, releases }: EffectiveVersionOptions): string {
  if (parseVersion(appVersion)) return appVersion;

  return releases[0]?.version ?? appVersion;
}

export type UnseenReleasesOptions = {
  releases: readonly WhatsNewRelease[];
  seenVersion: string;
  currentVersion: string;
};

/**
 * Releases newer than the confirmed one, up to the running version, newest first: what the user has
 * not seen yet, also when they skipped updates.
 */
export function unseenReleases({
  releases,
  seenVersion,
  currentVersion,
}: UnseenReleasesOptions): WhatsNewRelease[] {
  return releases
    .filter(
      (release) =>
        compareVersions(release.version, seenVersion) > 0 &&
        compareVersions(release.version, currentVersion) <= 0,
    )
    .sort((a, b) => compareVersions(b.version, a.version));
}

export type CurrentReleaseOptions = {
  releases: readonly WhatsNewRelease[];
  currentVersion: string;
};

/** The newest release up to the running version: what "Was ist neu" in the gear menu shows. */
export function currentRelease({
  releases,
  currentVersion,
}: CurrentReleaseOptions): WhatsNewRelease | null {
  return (
    [...releases]
      .filter((release) => compareVersions(release.version, currentVersion) <= 0)
      .sort((a, b) => compareVersions(b.version, a.version))[0] ?? null
  );
}

export type InitialSeenVersionOptions = {
  hadEarlierVisit: boolean;
  currentVersion: string;
  lastVersionWithout: string;
};

/**
 * What counts as confirmed when the browser has no answer yet. A fresh install has nothing to catch
 * up on; someone who used an older version without this feature gets the highlights since then.
 */
export function initialSeenVersion({
  hadEarlierVisit,
  currentVersion,
  lastVersionWithout,
}: InitialSeenVersionOptions): string {
  return hadEarlierVisit ? lastVersionWithout : currentVersion;
}
