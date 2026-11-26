import {
  ACTION_DOMAINS,
  DELETABLE_FLOW_DOMAINS,
  DELETABLE_HELPER_DOMAINS,
  ENTRY_ACTION,
  STATE_ON,
  type EntryAction,
} from "@/constants/entries";
import type { Entry } from "@/types/entry";

export type SupportsActionOptions = {
  /** Disabled entities have no state and cannot act. */
  entry: Entry;
  action: EntryAction;
};

/**
 * Whether HA supports an action for this entry (mirrors the backend).
 */
export function supportsAction({ entry, action }: SupportsActionOptions): boolean {
  return !entry.isDisabled && ACTION_DOMAINS[action].includes(entry.domain);
}

/** An on/off switch makes sense when the entry can be switched both ways. */
export function canToggle(entry: Entry): boolean {
  return (
    supportsAction({ entry, action: ENTRY_ACTION.turnOn }) &&
    supportsAction({ entry, action: ENTRY_ACTION.turnOff })
  );
}

export function isOn(entry: Entry): boolean {
  return entry.state === STATE_ON;
}

/** The action a switch triggers: off when it is on, on otherwise. */
export function toggleAction(entry: Entry): EntryAction {
  return isOn(entry) ? ENTRY_ACTION.turnOff : ENTRY_ACTION.turnOn;
}

/**
 * Storage helpers, automations and scripts can be deleted here (the backend refuses flows from
 * packages); template or group helpers only in HA.
 */
export function canDelete(entry: Entry): boolean {
  return (
    entry.isInRegistry &&
    (DELETABLE_HELPER_DOMAINS.includes(entry.domain) ||
      DELETABLE_FLOW_DOMAINS.includes(entry.domain))
  );
}

/**
 * HomeAce Studio copies automations, scripts and storage helpers with folder, labels and area;
 * scenes and template or group helpers not yet.
 */
export function canDuplicate(entry: Entry): boolean {
  return (
    entry.isInRegistry &&
    (DELETABLE_FLOW_DOMAINS.includes(entry.domain) ||
      DELETABLE_HELPER_DOMAINS.includes(entry.domain))
  );
}

/** Helpers whose settings HomeAce Studio edits: the storage helpers (input_*, counter, timer). */
export function hasEditableSettings(entry: Entry): boolean {
  return entry.isInRegistry && DELETABLE_HELPER_DOMAINS.includes(entry.domain);
}
