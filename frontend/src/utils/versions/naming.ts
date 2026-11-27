import { VERSION_LIMITS } from "@/constants/versions";

type Named = { id: string; name?: string };

export type WouldDropOptions = {
  /** Oldest first, as the backend sends them. */
  versions: readonly Named[];
  versionId: string;
};

/**
 * Whether taking the name away would delete the version at once: as many newer versions without a
 * name exist as stay, so it would be the oldest beyond the limit. Same rule as the backend, which
 * refuses it without confirmation.
 */
export function wouldDropWhenUnnamed({ versions, versionId }: WouldDropOptions): boolean {
  const index = versions.findIndex((version) => version.id === versionId);
  if (index < 0) return false;

  const newerUnnamed = versions.slice(index + 1).filter((version) => !version.name).length;
  return newerUnnamed >= VERSION_LIMITS.unnamed;
}

export type QuickVersionsOptions<T> = {
  /** Oldest first; the last one is "Jetzt" and never offered. */
  versions: readonly T[];
  /** Index of the version shown on the left. */
  index: number;
  count: number;
};

/**
 * The versions offered to click through, in time order like the columns (old left, new right). Always
 * `count` of them; the window slides with the chosen version, so the arrows move the mark the way
 * they point.
 */
export function quickVersions<T>({ versions, index, count }: QuickVersionsOptions<T>): T[] {
  const before = versions.slice(0, -1);
  const start = Math.max(0, Math.min(index, before.length - count));

  return before.slice(start, start + count);
}
