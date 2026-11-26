import type { DisplayBlock } from "@/types/editor";

import { CLASSIC_ICON } from "../blockIcons";
import { parsePath } from "../configPath";
import { classicBlock, genericBlock } from "./blocks";
import {
  addTarget,
  asRecord,
  asText,
  baseBlock,
  join,
  listBlocks,
  type Context,
  type Raw,
} from "./context";

/** Classic trigger kinds HA keeps outside the catalog, with the fields shown as chips. */
const CLASSIC_TRIGGER_FIELDS: Record<string, string[]> = {
  state: ["attribute", "from", "to", "not_from", "not_to", "for"],
  numeric_state: ["attribute", "above", "below", "for"],
  time: ["at"],
  time_pattern: ["hours", "minutes", "seconds"],
  sun: ["event", "offset"],
  template: ["value_template", "for"],
  event: ["event_type"],
  homeassistant: ["event"],
};

const CLASSIC_CONDITION_FIELDS: Record<string, string[]> = {
  state: ["attribute", "state", "for"],
  numeric_state: ["attribute", "above", "below"],
  template: ["value_template"],
  time: ["after", "before", "weekday"],
  sun: ["after", "before"],
  zone: ["zone"],
  trigger: ["id"],
};

/** Condition kinds that only group other conditions. */
const GROUP_CONDITIONS = ["and", "or", "not"];

// ---- triggers --------------------------------------------------------------------------

export function triggerBlocks(value: unknown, path: string, context: Context): DisplayBlock[] {
  return listBlocks(value, path, (raw, id) => triggerBlock(asRecord(raw), id, context));
}

function triggerBlock(raw: Raw, id: string, context: Context): DisplayBlock {
  const key = asText(raw.trigger) ?? asText(raw.platform) ?? "";
  const classicFields = CLASSIC_TRIGGER_FIELDS[key];

  if (classicFields) return classicBlock("trigger", key, raw, classicFields, id, context);

  return genericBlock("trigger", key, raw, "options", id, context);
}

// ---- conditions ------------------------------------------------------------------------

export function conditionBlocks(value: unknown, path: string, context: Context): DisplayBlock[] {
  return listBlocks(value, path, (raw, id) => conditionBlock(raw, id, context));
}

export function conditionBlock(value: unknown, id: string, context: Context): DisplayBlock {
  // A plain string is HA's shorthand for a template condition; editing replaces the string.
  if (typeof value === "string") {
    const block = classicBlock(
      "condition",
      "template",
      { value_template: value },
      ["value_template"],
      id,
      context,
    );
    const chip = block.chips[0];
    if (chip?.edit) chip.edit = { ...chip.edit, path: parsePath(id) };
    return block;
  }

  const raw = asRecord(value);
  const key = asText(raw.condition) ?? "";

  if (GROUP_CONDITIONS.includes(key)) {
    const block = baseBlock(
      "condition",
      CLASSIC_ICON.group ?? "",
      context.texts.titles[key] ?? key,
      id,
      raw,
    );
    const listPath = join(id, "conditions");
    block.branches = [
      {
        label: "",
        blocks: conditionBlocks(raw.conditions, listPath, context),
        add: [addTarget("condition", listPath)],
      },
    ];
    return block;
  }

  const classicFields = CLASSIC_CONDITION_FIELDS[key];

  if (classicFields) return classicBlock("condition", key, raw, classicFields, id, context);

  return genericBlock("condition", key, raw, "options", id, context);
}
