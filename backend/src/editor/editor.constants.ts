export const EDITOR_REPOSITORY = Symbol("EDITOR_REPOSITORY");

/** Languages the UI has; the catalog texts come from HA in the same language. */
export const CATALOG_LANGUAGES = ["de", "en", "ru"] as const;
export const DEFAULT_CATALOG_LANGUAGE = "de";

/** The catalog changes only when integrations change; reload it at most every 10 minutes. */
export const CATALOG_CACHE_MS = 10 * 60 * 1000;

/** Automations and scripts, the kinds that have a flow (same values as FLOW_KIND). */
export const FLOW_KINDS = ["automation", "script"] as const;

export const FLOW_NAME_MAX_LENGTH = 100;

/** Injection token for the clock that makes new automation ids; tests pass a fixed one. */
export const FLOW_CLOCK = Symbol("FLOW_CLOCK");

/**
 * HA registers the entity of a new flow after reloading all automations or scripts, which takes
 * longer than for a helper; look for it up to 25 × 200 ms.
 */
export const FLOW_LOOKUP_ATTEMPTS = 25;
export const FLOW_LOOKUP_DELAY_MS = 200;
