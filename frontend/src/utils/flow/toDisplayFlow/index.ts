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

export type ToDisplayFlowOptions = {
  flow: Flow;
  catalog: EditorCatalog | null;
  texts: FlowTexts;
  targetNames?: TargetNames;
};

/**
 * Turns the stored config of an automation or script into blocks for the flow view.
 *
 * Nothing is dropped: blocks the editor does not know become "unknown" blocks with their raw
 * config, so the view can still list them and saving keeps them unchanged. Editable chips carry
 * their exact place in the config (`edit.path`), so an edit changes only that one value.
 */
export function toDisplayFlow({
  flow,
  catalog,
  texts,
  targetNames = NO_TARGET_NAMES,
}: ToDisplayFlowOptions): DisplayFlow {
  const context: Context = { catalog, names: flow.entityNames, targetNames, texts };
  const config = flow.config;
  const mode = asText(config.mode) ?? DEFAULT_MODE;

  if (flow.kind === "script") {
    const sequence = addTarget({ section: "action", path: "sequence" });

    return {
      mode,
      triggers: [],
      conditions: [],
      actions: actionBlocks({ value: config.sequence, path: "sequence", context }),
      add: { triggers: sequence, conditions: sequence, actions: sequence },
    };
  }

  // New syntax (triggers/conditions/actions) with a fallback to the old one; paths use the key
  // the config really has.
  const triggerKey = keyIn({ raw: config, keys: ["triggers", "trigger"] });
  const conditionKey = keyIn({ raw: config, keys: ["conditions", "condition"] });
  const actionKey = keyIn({ raw: config, keys: ["actions", "action"] });

  return {
    mode,
    triggers: triggerBlocks({ value: config[triggerKey], path: triggerKey, context }),
    conditions: conditionBlocks({ value: config[conditionKey], path: conditionKey, context }),
    actions: actionBlocks({ value: config[actionKey], path: actionKey, context }),
    add: {
      triggers: addTarget({ section: "trigger", path: triggerKey }),
      conditions: addTarget({ section: "condition", path: conditionKey }),
      actions: addTarget({ section: "action", path: actionKey }),
    },
  };
}
