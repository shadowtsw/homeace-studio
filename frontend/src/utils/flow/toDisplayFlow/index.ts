import type { DisplayFlow, EditorCatalog, Flow } from "@/types/editor";

import { actionBlocks } from "./actions";
import {
  addTarget,
  asText,
  keyIn,
  type Context,
  type FlowTexts,
  type TargetNames,
} from "./context";
import { conditionBlocks, triggerBlocks } from "./triggers";

export type { FlowTexts, TargetNames } from "./context";

const NO_TARGET_NAMES: TargetNames = { floors: {}, labels: {} };

/** What HA does when the config has no `mode`. */
const DEFAULT_MODE = "single";

/**
 * Turns the stored config of an automation or script into blocks for the flow view.
 *
 * Nothing is dropped: blocks the editor does not know become "unknown" blocks with their raw
 * config, so the view can still list them and saving keeps them unchanged. Editable chips carry
 * their exact place in the config (`edit.path`), so an edit changes only that one value.
 */
export function toDisplayFlow(
  flow: Flow,
  catalog: EditorCatalog | null,
  texts: FlowTexts,
  targetNames: TargetNames = NO_TARGET_NAMES,
): DisplayFlow {
  const context: Context = { catalog, names: flow.entityNames, targetNames, texts };
  const config = flow.config;
  const mode = asText(config.mode) ?? DEFAULT_MODE;

  if (flow.kind === "script") {
    const sequence = addTarget("action", "sequence");

    return {
      mode,
      triggers: [],
      conditions: [],
      actions: actionBlocks(config.sequence, "sequence", context),
      add: { triggers: sequence, conditions: sequence, actions: sequence },
    };
  }

  // New syntax (triggers/conditions/actions) with a fallback to the old one; paths use the key
  // the config really has.
  const triggerKey = keyIn(config, ["triggers", "trigger"]);
  const conditionKey = keyIn(config, ["conditions", "condition"]);
  const actionKey = keyIn(config, ["actions", "action"]);

  return {
    mode,
    triggers: triggerBlocks(config[triggerKey], triggerKey, context),
    conditions: conditionBlocks(config[conditionKey], conditionKey, context),
    actions: actionBlocks(config[actionKey], actionKey, context),
    add: {
      triggers: addTarget("trigger", triggerKey),
      conditions: addTarget("condition", conditionKey),
      actions: addTarget("action", actionKey),
    },
  };
}
