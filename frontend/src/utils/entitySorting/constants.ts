import type { SortingConditionType, SortingRole } from "@/types/entitySorting";

/**
 * Weights and thresholds of the proposals. Tuned on the dummy's example home; adjust them here (and
 * in the tests) when real homes show otherwise. docs/features/entity-sorting.md explains each one.
 */

/** How much a flow's use counts, before it is divided by √(entities the flow uses). */
export const ROLE_WEIGHT: Record<SortingRole, number> = {
  action: 3,
  member: 3,
  trigger: 2,
  condition: 1,
  value: 1,
  // A call starts a script or scene, which are entries, not plain entities.
  call: 0,
};

export const AREA_WEIGHT = 2.5;
/** Most one learned word can add; reached with LEARN_FULL_AT sorted examples. */
export const LEARN_WEIGHT = 1.2;
export const LEARN_FULL_AT = 3;
/** Most all learned words of one bundle add together. */
export const LEARN_CAP = 2.4;
/** A word sorted into more folders than this says nothing. */
export const LEARN_MAX_FOLDERS = 3;
/** A correction by the user teaches twice as much as a plain tick. */
export const CORRECTION_WEIGHT = 2;

/** "sicher": the winner leads by this share of all votes, and enough votes came in. */
export const SURE_MARGIN = 0.6;
export const SURE_TOTAL = 2;
export const LIKELY_MARGIN = 0.3;
/** Two sorted examples of a word (0.8) count as likely; one (0.4) does not. */
export const LIKELY_TOTAL = 0.75;
/** The deepest folder holding this share of the votes wins (common parent when they disagree). */
export const COMMON_PARENT_SHARE = 0.65;

/** Used by flows in this many top folders without a clear majority: "überall genutzt". */
export const EVERYWHERE_TOP_FOLDERS = 3;
export const EVERYWHERE_MAX_SHARE = 0.6;

/** A new folder needs at least this many bundles or entities. */
export const GROUP_MIN_BUNDLES = 3;
export const GROUP_MIN_ENTITIES = 5;

/** Integrations that carry devices of every kind; "same integration" says nothing for them. */
export const HUB_INTEGRATIONS = new Set([
  "mqtt",
  "zha",
  "zwave_js",
  "deconz",
  "matter",
  "thread",
  "template",
  "group",
  "modbus",
  "knx",
  "esphome",
  "homekit_controller",
  "tasmota",
]);

/** Entities without a device that belong to the system; value = key of their name in the UI texts. */
export const SYSTEM_DOMAINS = new Set(["sun", "zone", "person", "weather", "update"]);
export const SYSTEM_INTEGRATIONS = new Set(["backup", "hassio", "hacs"]);

/** Words that say nothing about where something belongs (German and English). */
export const STOP_WORDS = new Set([
  "sensor",
  "switch",
  "light",
  "schalter",
  "status",
  "smart",
  "plug",
  "der",
  "die",
  "das",
  "und",
  "the",
  "and",
  "akku",
  "battery",
  "signal",
  "firmware",
  "update",
  "neu",
  "starten",
  "restart",
  "leistung",
  "power",
  "energie",
  "energy",
  "temperatur",
  "temperature",
  "media",
  "player",
  "display",
]);

/** Main entity first: what the device is about, not its battery. */
export const DOMAIN_ORDER = [
  "light",
  "switch",
  "climate",
  "cover",
  "valve",
  "fan",
  "media_player",
  "lock",
  "vacuum",
  "binary_sensor",
  "sensor",
  "number",
  "select",
  "button",
  "update",
];

export const RULE_PLACEHOLDER = { area: "{area}", floor: "{floor}" } as const;

/** Key prefix of a bundle without device; same as the backend's ENTITY_BUNDLE_PREFIX. */
export const ENTITY_BUNDLE_PREFIX = "entity:";

/** The kinds of conditions a rule can have, in the order the rule editor offers them. */
export const CONDITION_TYPES: SortingConditionType[] = [
  "label",
  "area",
  "floor",
  "manufacturer",
  "integration",
  "domain",
  "deviceClass",
  "nameContains",
];
