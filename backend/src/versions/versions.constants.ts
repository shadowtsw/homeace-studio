export const VERSIONS_REPOSITORY = Symbol("VERSIONS_REPOSITORY");
export const VERSION_TARGET_REPOSITORY = Symbol("VERSION_TARGET_REPOSITORY");
export const VERSIONS_DIR = Symbol("VERSIONS_DIR");
export const VERSIONS_CLOCK = Symbol("VERSIONS_CLOCK");

/** Folder name next to the overlay file (the add-on config folder, part of HA backups). */
export const VERSIONS_FOLDER = "versions";

/** Versions without a name per entry; the oldest drops out beyond this. */
export const MAX_UNNAMED_VERSIONS = 20;
/** Named versions per entry; naming one more is refused. */
export const MAX_NAMED_VERSIONS = 10;
/** A name is plain text of at most this many characters. */
export const MAX_VERSION_NAME_LENGTH = 40;
/** Saves in HomeAce Studio within this time join one version (automatic saving). */
export const OPEN_VERSION_MS = 10 * 60 * 1000;

/** HA reloads come in bursts (automations, scripts and scenes at once); compare once after it. */
export const RELOAD_SETTLE_MS = 2_000;
/** Stored configs read at the same time while comparing, to stay light on HA. */
export const COMPARE_CONCURRENCY = 4;
/** Renames kept for bringing back old versions; the oldest drop out beyond this. */
export const MAX_KEPT_RENAMES = 500;

/** HA events after which stored configs may have changed. */
export const RELOAD_EVENTS: readonly string[] = ["automation_reloaded", "scene_reloaded"];
/** `call_service` events of these domains with service `reload` count as a reload too. */
export const RELOAD_DOMAINS: readonly string[] = ["automation", "script", "scene"];
export const CALL_SERVICE_EVENT = "call_service";
export const RELOAD_SERVICE = "reload";
