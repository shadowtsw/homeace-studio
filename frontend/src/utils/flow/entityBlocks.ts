import type { BlockSection, EditorCatalog, EntityOption } from "@/types/editor";

import { newBlock } from "./blockTypes";
import { DOMAIN_STATES } from "./stateSuggestions";

type Raw = Record<string, unknown>;

/** A text for a choice: an i18n key below `flow.drop.choice` with params, or a name from HA. */
export type ChoiceLabel = { key: string; params?: Record<string, string> } | { text: string };

/** One thing a dropped entity can become in a section, with the new block's config. */
export type EntityChoice = { label: ChoiceLabel; item: Raw };

/** What an entity can become in a section, or why it does not fit (key below `flow.drop.why`). */
export type EntityFit = { choices: EntityChoice[] } | { reason: string };

/** Device classes that mean "someone is there or moving". */
const MOTION_CLASSES = new Set(["motion", "occupancy", "presence", "moving"]);
/** Device classes of contacts that open and close. */
const OPENING_CLASSES = new Set(["door", "window", "opening", "garage_door"]);
/** Domains whose states are plainly on and off. */
const ON_OFF_DOMAINS = new Set(["light", "switch", "fan", "input_boolean", "siren", "humidifier"]);
/** Domains that report where someone is. */
const PRESENCE_DOMAINS = new Set(["person", "device_tracker"]);
/** Domains with a number as their state. */
const NUMBER_DOMAINS = new Set(["sensor", "number", "input_number"]);
/** States a device only passes through; not worth a choice. */
const PASSING_STATES = new Set(["opening", "closing", "locking", "unlocking", "jammed"]);

/** What a device can be told to do, in the order offered. Only those HA describes are shown. */
const ACTIONS_BY_DOMAIN: Record<string, string[]> = {
  light: ["light.turn_on", "light.turn_off", "light.toggle"],
  switch: ["switch.turn_on", "switch.turn_off", "switch.toggle"],
  fan: ["fan.turn_on", "fan.turn_off"],
  input_boolean: ["input_boolean.turn_on", "input_boolean.turn_off", "input_boolean.toggle"],
  cover: ["cover.open_cover", "cover.close_cover", "cover.stop_cover"],
  valve: ["valve.open_valve", "valve.close_valve"],
  climate: ["climate.set_temperature", "climate.turn_off"],
  media_player: ["media_player.media_play", "media_player.media_pause", "media_player.turn_off"],
  lock: ["lock.lock", "lock.unlock"],
  vacuum: ["vacuum.start", "vacuum.return_to_base"],
  scene: ["scene.turn_on"],
  script: ["script.turn_on"],
  button: ["button.press"],
  input_button: ["input_button.press"],
  alarm_control_panel: [
    "alarm_control_panel.alarm_arm_away",
    "alarm_control_panel.alarm_arm_night",
    "alarm_control_panel.alarm_disarm",
  ],
};

type StateKind = "motion" | "opening" | "onOff" | "presence" | "other";

function stateKindOf(entity: EntityOption): StateKind {
  const deviceClass = entity.deviceClass ?? "";

  if (entity.domain === "binary_sensor" && MOTION_CLASSES.has(deviceClass)) return "motion";
  if (entity.domain === "binary_sensor" && OPENING_CLASSES.has(deviceClass)) return "opening";
  if (entity.domain === "cover" || entity.domain === "valve") return "opening";
  if (ON_OFF_DOMAINS.has(entity.domain) || entity.domain === "binary_sensor") return "onOff";
  if (PRESENCE_DOMAINS.has(entity.domain)) return "presence";

  return "other";
}

/** A measured value (temperature, power …) rather than a state like on/off. */
function isNumeric(entity: EntityOption): boolean {
  const hasNumber = entity.state.trim() !== "" && !Number.isNaN(Number(entity.state));

  return NUMBER_DOMAINS.has(entity.domain) && entity.options === null && hasNumber;
}

/** The states worth offering: the entity's own options, else the usual ones of its domain. */
function statesOf(entity: EntityOption): string[] {
  const usual = entity.options ?? DOMAIN_STATES[entity.domain] ?? [];

  return usual.filter((state) => !PASSING_STATES.has(state));
}

/** Words for the usual states (key below `flow.drop.choice`), per kind and state. */
const TRIGGER_WORD: Record<StateKind, Record<string, string>> = {
  motion: { on: "motionOn", off: "motionOff" },
  opening: { on: "opens", off: "closes", open: "opens", closed: "closes" },
  onOff: { on: "turnsOn", off: "turnsOff" },
  presence: { home: "comesHome", not_home: "leaves" },
  other: {},
};
const CONDITION_WORD: Record<StateKind, Record<string, string>> = {
  motion: { on: "isMotion", off: "isNoMotion" },
  opening: { on: "isOpen", off: "isClosed", open: "isOpen", closed: "isClosed" },
  onOff: { on: "isOn", off: "isOff" },
  presence: { home: "isHome", not_home: "isAway" },
  other: {},
};

function stateLabel(words: Record<string, string>, state: string, fallback: string): ChoiceLabel {
  const key = words[state];

  return key ? { key } : { key: fallback, params: { state } };
}

function triggerChoices(entity: EntityOption): EntityChoice[] {
  const entityId = entity.entityId;
  const value = Number(entity.state);

  // A measured value: over or under a limit, starting at what it shows right now
  if (isNumeric(entity)) {
    return [
      {
        label: { key: "above" },
        item: { trigger: "numeric_state", entity_id: entityId, above: value },
      },
      {
        label: { key: "below" },
        item: { trigger: "numeric_state", entity_id: entityId, below: value },
      },
    ];
  }

  // Known states, else "changes" in any way
  const states = statesOf(entity);
  if (states.length === 0) {
    return [{ label: { key: "changes" }, item: { trigger: "state", entity_id: entityId } }];
  }

  const words = TRIGGER_WORD[stateKindOf(entity)];
  return states.map((state) => ({
    label: stateLabel(words, state, "changesTo"),
    item: { trigger: "state", entity_id: entityId, to: state },
  }));
}

function conditionChoices(entity: EntityOption): EntityChoice[] {
  const entityId = entity.entityId;
  const value = Number(entity.state);

  if (isNumeric(entity)) {
    return [
      {
        label: { key: "isAbove" },
        item: { condition: "numeric_state", entity_id: entityId, above: value },
      },
      {
        label: { key: "isBelow" },
        item: { condition: "numeric_state", entity_id: entityId, below: value },
      },
    ];
  }

  // Without known states, the state it has right now
  const known = statesOf(entity);
  const states = known.length > 0 ? known : [entity.state].filter(Boolean);
  const words = CONDITION_WORD[stateKindOf(entity)];

  return states.map((state) => ({
    label: stateLabel(words, state, "isState"),
    item: { condition: "state", entity_id: entityId, state },
  }));
}

function actionChoices(entity: EntityOption, catalog: EditorCatalog | null): EntityFit {
  // Sensors only report
  const keys = ACTIONS_BY_DOMAIN[entity.domain] ?? [];
  if (keys.length === 0) {
    if (entity.domain === "binary_sensor") return { reason: "sensor" };
    if (NUMBER_DOMAINS.has(entity.domain)) return { reason: "measure" };
    return { reason: "noAction" };
  }

  // Only what HA describes, named the way HA names it; the block gets HA's defaults
  const described = catalog ? keys.filter((key) => key in catalog.actions) : keys;
  if (described.length === 0) return { reason: "noAction" };

  return {
    choices: described.map((key) => {
      const name = catalog?.actions[key]?.name ?? key;
      const block = newBlock("action", { key, label: name, icon: "", isClassic: false }, catalog);

      return { label: { text: name }, item: { ...block, target: { entity_id: entity.entityId } } };
    }),
  };
}

/**
 * What a plain entity can become when it is dropped on a section of a flow: a motion sensor on
 * "Wenn" offers "Bewegung erkannt" / "Keine Bewegung mehr", a light on "Dann" HA's "Einschalten" …
 * Sensors cannot be told to do anything; they say why instead.
 */
export function entityFit(
  entity: EntityOption,
  section: BlockSection,
  catalog: EditorCatalog | null,
): EntityFit {
  if (section === "trigger") return { choices: triggerChoices(entity) };
  if (section === "condition") return { choices: conditionChoices(entity) };

  return actionChoices(entity, catalog);
}

/** Device kinds a scene can hold (the same as "+ Gerät hinzufügen" offers). */
export const SCENE_DOMAINS = ["light", "switch", "cover", "climate", "fan", "media_player"];

/** Why an entity cannot go into a scene (key below `flow.drop.why`), or null when it can. */
export function sceneMisfit(entity: EntityOption): string | null {
  if (SCENE_DOMAINS.includes(entity.domain)) return null;
  if (entity.domain === "binary_sensor") return "sceneSensor";
  if (NUMBER_DOMAINS.has(entity.domain)) return "sceneMeasure";

  return "sceneOther";
}
