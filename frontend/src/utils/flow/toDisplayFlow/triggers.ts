import type { DisplayBlock } from "@/types/editor";
import { asRecord } from "@/utils/record";

import { CLASSIC_ICON } from "../blockIcons";
import { parsePath } from "../configPath";
import { classicBlock, genericBlock } from "./blocks";
import {
  addTarget,
  asText,
  baseBlock,
  join,
  listBlocks,
  type BlockListOptions,
  type BlockOptions,
  type Context,
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

export function triggerBlocks({ value, path, context }: BlockListOptions): DisplayBlock[] {
  return listBlocks({
    value,
    path,
    build: ({ raw, id }) => triggerBlock({ raw: asRecord(raw), id, context }),
  });
}

function triggerBlock({ raw, id, context }: BlockOptions): DisplayBlock {
  const key = asText(raw.trigger) ?? asText(raw.platform) ?? "";
  const classicFields = CLASSIC_TRIGGER_FIELDS[key];

  if (classicFields) {
    return classicBlock({ section: "trigger", kind: key, raw, fields: classicFields, id, context });
  }

  return genericBlock({ section: "trigger", key, raw, valuesKey: "options", id, context });
}

// ---- conditions ------------------------------------------------------------------------

export function conditionBlocks({ value, path, context }: BlockListOptions): DisplayBlock[] {
  return listBlocks({
    value,
    path,
    build: ({ raw, id }) => conditionBlock({ value: raw, id, context }),
  });
}

export type ConditionBlockOptions = {
  /** A condition object, or a plain string (HA's shorthand for a template condition). */
  value: unknown;
  id: string;
  context: Context;
};

export function conditionBlock({ value, id, context }: ConditionBlockOptions): DisplayBlock {
  // A plain string is HA's shorthand for a template condition; editing replaces the string.
  if (typeof value === "string") {
    const block = classicBlock({
      section: "condition",
      kind: "template",
      raw: { value_template: value },
      fields: ["value_template"],
      id,
      context,
    });
    const chip = block.chips[0];
    if (chip?.edit) chip.edit = { ...chip.edit, path: parsePath(id) };
    return block;
  }

  const raw = asRecord(value);
  const key = asText(raw.condition) ?? "";

  if (GROUP_CONDITIONS.includes(key)) {
    const block = baseBlock({
      section: "condition",
      icon: CLASSIC_ICON.group ?? "",
      title: context.texts.titles[key] ?? key,
      id,
      raw,
    });
    const listPath = join(id, "conditions");
    block.branches = [
      {
        label: "",
        blocks: conditionBlocks({ value: raw.conditions, path: listPath, context }),
        add: [addTarget({ section: "condition", path: listPath })],
      },
    ];
    return block;
  }

  const classicFields = CLASSIC_CONDITION_FIELDS[key];

  if (classicFields) {
    return classicBlock({
      section: "condition",
      kind: key,
      raw,
      fields: classicFields,
      id,
      context,
    });
  }

  return genericBlock({ section: "condition", key, raw, valuesKey: "options", id, context });
}
