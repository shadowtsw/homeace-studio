type VersionParts = [major: number, minor: number, patch: number];

const RELEASE_VERSION = /^(\d+)\.(\d+)\.(\d+)(?:[-+][\w.-]*)?$/;

/**
 * The numbers of a release version: "0.14.0" → [0, 14, 0]; a suffix like "0.14.0-beta" is ignored.
 *
 * @returns null for anything else, e.g. "local" or "dev" of a test build.
 */
export function parseVersion(version: string): VersionParts | null {
  const match = RELEASE_VERSION.exec(version.trim());

  return match ? [Number(match[1]), Number(match[2]), Number(match[3])] : null;
}

/**
 * Orders two versions.
 *
 * @returns Negative when `a` is older than `b`, 0 when both are the same, positive when `a` is newer.
 *   A version that is no release version counts as older than every release.
 */
export function compareVersions(a: string, b: string): number {
  const left = parseVersion(a);
  const right = parseVersion(b);

  if (!left || !right) return Number(Boolean(left)) - Number(Boolean(right));

  return left[0] - right[0] || left[1] - right[1] || left[2] - right[2];
}
