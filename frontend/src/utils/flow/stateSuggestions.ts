import type { EntityOption } from "@/types/editor";

const DOMAIN_SEPARATOR = ".";
const ON_OFF = ["on", "off"];

/** The usual states per domain, as HA stores them (not translated). */
export const DOMAIN_STATES: Record<string, string[]> = {
  automation: ON_OFF,
  binary_sensor: ON_OFF,
  fan: ON_OFF,
  input_boolean: ON_OFF,
  light: ON_OFF,
  script: ON_OFF,
  switch: ON_OFF,
  update: ON_OFF,
  alarm_control_panel: [
    "disarmed",
    "armed_home",
    "armed_away",
    "armed_night",
    "armed_vacation",
    "triggered",
  ],
  climate: ["off", "heat", "cool", "heat_cool", "auto", "dry", "fan_only"],
  cover: ["open", "closed", "opening", "closing"],
  device_tracker: ["home", "not_home"],
  lock: ["locked", "unlocked", "locking", "unlocking", "jammed", "open"],
  media_player: ["off", "on", "idle", "playing", "paused", "standby"],
  person: ["home", "not_home"],
  sun: ["above_horizon", "below_horizon"],
  timer: ["idle", "active", "paused"],
  valve: ["open", "closed", "opening", "closing"],
  vacuum: ["cleaning", "docked", "idle", "paused", "returning", "error"],
};

/**
 * States worth offering for "changes to …" and "is …": the entity's own options (select
 * helpers), the usual states of its domain, and what it is right now.
 *
 * @param entityIds - The entities of the block.
 * @param entities - All entities from HA (may still be empty while loading).
 * @example stateSuggestions(["light.flur"], entities) // ["on", "off"]
 */
export function stateSuggestions(entityIds: string[], entities: EntityOption[]): string[] {
  const byId = new Map(entities.map((entity) => [entity.entityId, entity]));
  const suggestions = entityIds.flatMap((entityId) => {
    const entity = byId.get(entityId);
    const domain = entityId.split(DOMAIN_SEPARATOR)[0] ?? "";

    return [...(entity?.options ?? []), ...(DOMAIN_STATES[domain] ?? []), entity?.state ?? ""];
  });

  return [...new Set(suggestions.filter(Boolean))];
}
