/** The entries that keep versions: what HomeAce Studio can edit as a whole config. */
export const VERSION_KIND = {
  automation: "automation",
  script: "script",
  scene: "scene",
} as const;

export type VersionKind = (typeof VERSION_KIND)[keyof typeof VERSION_KIND];

/** Where a version came from. */
export const VERSION_SOURCE = {
  /** The first version HomeAce Studio saw (first start with versions, or an entry it had not seen). */
  base: "base",
  /** Saved in HomeAce Studio. */
  homeace: "homeace",
  /** Changed outside HomeAce Studio while it was running (HA's editor, a YAML file, another tool). */
  outside: "outside",
  /** Changed outside while HomeAce Studio was not running; the time lies between `since` and `at`. */
  offline: "offline",
  /** An earlier version brought back. */
  restore: "restore",
  /** Reserved for changes made by an AI; nothing writes it yet (the AI access only plans folders). */
  ai: "ai",
} as const;

export type VersionSource = (typeof VERSION_SOURCE)[keyof typeof VERSION_SOURCE];

/** Who saved a version in HomeAce Studio, from HA's ingress headers. */
export type VersionUser = { id: string; name: string };

/** One state of an entry's whole config. */
export type Version = {
  id: string;
  /** When it was saved, ISO 8601. For an open version: when the first change of it was saved. */
  at: string;
  source: VersionSource;
  /** The config as HA stores it. */
  config: Record<string, unknown>;
  /** Saved in HomeAce Studio by this HA user; missing outside HA's ingress. */
  user?: VersionUser;
  /** A name the user gave it ("läuft stabil"). Named versions are kept beyond the normal limit. */
  name?: string;
  /**
   * Until when further saves in HomeAce Studio join this version, epoch ms. Automatic saving would
   * otherwise create a version every few seconds.
   */
  openUntil?: number;
  /** Number of saves that went into this version. */
  saves?: number;
  /** `offline` only: the last time HomeAce Studio saw the old config, ISO 8601. */
  since?: string;
  /** `restore` only: the version that was brought back. */
  restoredFrom?: { id: string; at: string; name?: string };
  /** `restore` only: the whole entry came back from the trash. */
  fromTrash?: boolean;
};

/** Identifies an entry's config independent of its entity ID, which the user can rename. */
export type VersionRef = {
  kind: VersionKind;
  /** HA's storage key: the automation's or scene's `id`, the script's object ID. */
  key: string;
  /** The entity ID at the time it was last seen. */
  entityId: string;
};

/** Where an entry was deleted: in HomeAce Studio or outside (HA's editor, a YAML file). */
export type DeletedWhere = "homeace" | "outside";

/** An entry in the trash: deleted, kept with its versions for TRASH_DAYS days. */
export type DeletedMark = { at: string; where: DeletedWhere; name: string };

/** All versions of one entry, oldest first. */
export type VersionHistory = {
  ref: VersionRef;
  versions: Version[];
  /** Set while the entry is in the trash. */
  deleted?: DeletedMark;
  /** When HomeAce Studio last compared the stored config with the newest version, ISO 8601. */
  checkedAt?: string;
};

/** An entity ID the user renamed in HomeAce Studio, so old versions can be brought back. */
export type EntityRename = { from: string; to: string; at: string };
