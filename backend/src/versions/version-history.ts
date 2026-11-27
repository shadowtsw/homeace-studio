import {
  MAX_NAMED_VERSIONS,
  MAX_UNNAMED_VERSIONS,
  MAX_VERSION_NAME_LENGTH,
  OPEN_VERSION_MS,
} from "./versions.constants";
import {
  VERSION_SOURCE,
  type EntityRename,
  type Version,
  type VersionHistory,
  type VersionSource,
  type VersionUser,
} from "./versions.model";

/** The same config, whatever order HA writes the keys in. */
export function sameConfig(a: Record<string, unknown>, b: Record<string, unknown>): boolean {
  return stableJson(a) === stableJson(b);
}

function stableJson(value: unknown): string {
  return JSON.stringify(value, (_key, inner: unknown) => {
    if (inner === null || typeof inner !== "object" || Array.isArray(inner)) return inner;

    const record = inner as Record<string, unknown>;
    return Object.fromEntries(
      Object.keys(record)
        .sort()
        .map((key) => [key, record[key]]),
    );
  });
}

export type AddVersionOptions = {
  history: VersionHistory;
  config: Record<string, unknown>;
  source: VersionSource;
  now: number;
  newId: () => string;
  user?: VersionUser;
  /** `offline`: when the old config was last seen. */
  since?: string;
  /** `restore`: the version that was brought back. */
  restoredFrom?: Version;
  /** Brought back from the trash: a version even when the config did not change. */
  fromTrash?: boolean;
};

/**
 * The history with one more version.
 *
 * - A config equal to the newest version adds nothing, so reloads and HomeAce Studio's own saves
 *   never create empty versions.
 * - Saves in HomeAce Studio join the open version for OPEN_VERSION_MS after its first save.
 * - Every other source closes the open version and gets a version of its own.
 * - Beyond MAX_UNNAMED_VERSIONS, the oldest versions without a name drop out.
 */
export function addVersion({
  history,
  config,
  source,
  now,
  newId,
  user,
  since,
  restoredFrom,
  fromTrash,
}: AddVersionOptions): VersionHistory {
  const newest = history.versions.at(-1);
  if (newest && !fromTrash && sameConfig(newest.config, config)) return history;

  if (newest && source === VERSION_SOURCE.homeace && isOpen({ version: newest, now })) {
    const joined: Version = { ...newest, config, saves: (newest.saves ?? 1) + 1 };
    return { ...history, versions: [...history.versions.slice(0, -1), joined] };
  }

  const closed = history.versions.map(closeVersion);
  const version: Version = { id: newId(), at: new Date(now).toISOString(), source, config };
  if (user) version.user = user;
  if (since) version.since = since;
  if (source === VERSION_SOURCE.homeace) {
    version.openUntil = now + OPEN_VERSION_MS;
    version.saves = 1;
  }
  if (restoredFrom) version.restoredFrom = describeRestored(restoredFrom);
  if (fromTrash) version.fromTrash = true;

  return { ...history, versions: dropOldUnnamed([...closed, version]) };
}

function describeRestored(version: Version): NonNullable<Version["restoredFrom"]> {
  if (version.name) return { id: version.id, at: version.at, name: version.name };

  return { id: version.id, at: version.at };
}

/** Whether saves in HomeAce Studio still join this version. */
export function isOpen({ version, now }: { version: Version; now: number }): boolean {
  return version.openUntil !== undefined && now < version.openUntil;
}

function closeVersion(version: Version): Version {
  if (version.openUntil === undefined) return version;

  const closed = { ...version };
  delete closed.openUntil;
  return closed;
}

/** Closes the open version now, so the next save starts a new one ("jetzt abschließen"). */
export function closeOpenVersion(history: VersionHistory): VersionHistory {
  return { ...history, versions: history.versions.map(closeVersion) };
}

function dropOldUnnamed(versions: Version[]): Version[] {
  const unnamed = versions.filter((version) => !version.name);
  const surplus = unnamed.length - MAX_UNNAMED_VERSIONS;
  if (surplus <= 0) return versions;

  const dropped = new Set(unnamed.slice(0, surplus).map((version) => version.id));
  return versions.filter((version) => !dropped.has(version.id));
}

export type NameVersionResult =
  | { ok: true; history: VersionHistory }
  | { ok: false; reason: "notFound" | "tooManyNamed" | "wouldDrop" };

/**
 * Whether taking the name away would delete the version at once: MAX_UNNAMED_VERSIONS newer versions
 * without a name exist, so it would be the oldest beyond the limit.
 */
export function wouldDropWhenUnnamed({
  versions,
  versionId,
}: {
  versions: readonly Version[];
  versionId: string;
}): boolean {
  const index = versions.findIndex((version) => version.id === versionId);
  if (index < 0) return false;

  const newerUnnamed = versions.slice(index + 1).filter((version) => !version.name).length;
  return newerUnnamed >= MAX_UNNAMED_VERSIONS;
}

/**
 * Gives a version a name, renames it, or takes the name away (`name` empty or null). A named version
 * no longer counts against MAX_UNNAMED_VERSIONS; taking the name away lets it drop out again. When that
 * would delete it at once, only with `allowDrop` (the user confirmed it), else "wouldDrop".
 */
export function nameVersion({
  history,
  versionId,
  name,
  allowDrop = false,
}: {
  history: VersionHistory;
  versionId: string;
  name: string | null;
  allowDrop?: boolean;
}): NameVersionResult {
  const target = history.versions.find((version) => version.id === versionId);
  if (!target) return { ok: false, reason: "notFound" };

  const cleanName = cleanVersionName(name);
  const namedCount = history.versions.filter((version) => version.name).length;
  if (cleanName && !target.name && namedCount >= MAX_NAMED_VERSIONS) {
    return { ok: false, reason: "tooManyNamed" };
  }

  const isUnnaming = !cleanName && Boolean(target.name);
  if (isUnnaming && !allowDrop && wouldDropWhenUnnamed({ versions: history.versions, versionId })) {
    return { ok: false, reason: "wouldDrop" };
  }

  const versions = history.versions.map((version) => {
    if (version.id !== versionId) return version;

    const closed = closeVersion(version);
    if (cleanName) return { ...closed, name: cleanName };

    const unnamed = { ...closed };
    delete unnamed.name;
    return unnamed;
  });

  return { ok: true, history: { ...history, versions: dropOldUnnamed(versions) } };
}

/** Plain text only: no control or direction characters, trimmed, at most MAX_VERSION_NAME_LENGTH. */
export function cleanVersionName(name: string | null): string {
  if (!name) return "";

  return [...name]
    .filter((char) => !isHiddenChar(char))
    .join("")
    .trim()
    .slice(0, MAX_VERSION_NAME_LENGTH);
}

/** Control characters and the marks that turn text direction (used to disguise names). */
function isHiddenChar(char: string): boolean {
  const code = char.codePointAt(0) ?? 0;

  return (
    code < 0x20 ||
    code === 0x7f ||
    (code >= 0x200e && code <= 0x200f) ||
    (code >= 0x202a && code <= 0x202e) ||
    (code >= 0x2066 && code <= 0x2069)
  );
}

/**
 * The config with renamed entity IDs replaced by their current ones, for bringing back a version
 * that is older than a rename. Only whole string values that equal an old ID are replaced.
 *
 * @returns The new config and the renames that were applied, oldest first.
 */
export function applyRenames({
  config,
  renames,
  since,
}: {
  config: Record<string, unknown>;
  renames: readonly EntityRename[];
  /** Only renames after this time matter (the version's `at`). */
  since: string;
}): { config: Record<string, unknown>; applied: EntityRename[] } {
  const relevant = renames.filter((rename) => rename.at > since);
  const current = new Map<string, string>();
  for (const rename of relevant) {
    for (const [from, to] of current) if (to === rename.from) current.set(from, rename.to);
    current.set(rename.from, rename.to);
  }

  const applied = new Map<string, EntityRename>();
  const replace = (value: unknown): unknown => {
    if (typeof value === "string") {
      const to = current.get(value);
      if (!to) return value;

      applied.set(value, { from: value, to, at: since });
      return to;
    }
    if (Array.isArray(value)) return value.map(replace);
    if (value !== null && typeof value === "object") {
      return Object.fromEntries(
        Object.entries(value as Record<string, unknown>).map(([key, inner]) => [
          key,
          replace(inner),
        ]),
      );
    }
    return value;
  };

  const replaced = replace(config) as Record<string, unknown>;
  return { config: replaced, applied: [...applied.values()] };
}
