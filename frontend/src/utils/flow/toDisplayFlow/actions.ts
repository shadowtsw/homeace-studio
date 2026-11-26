import type { BlockSection, DisplayBlock, DisplayBranch } from "@/types/editor";

import { CLASSIC_ICON, iconForKey, iconForSection } from "../blockIcons";
import { parsePath } from "../configPath";
import { genericBlock, unknownBlock } from "./blocks";
import {
  addTarget,
  asList,
  asRecord,
  asText,
  baseBlock,
  join,
  KEY_SEPARATOR,
  keyIn,
  listBlocks,
  unlabeled,
  type Context,
  type Raw,
} from "./context";
import { addableClassic, missingChips, valueChips } from "./fieldChips";
import { entityChip } from "./targetChips";
import { conditionBlock, conditionBlocks, triggerBlocks } from "./triggers";

export function actionBlocks(value: unknown, path: string, context: Context): DisplayBlock[] {
  return listBlocks(value, path, (raw, id) => actionBlock(asRecord(raw), id, context));
}

function actionBlock(raw: Raw, id: string, context: Context): DisplayBlock {
  const service = asText(raw.action) ?? asText(raw.service);

  if (service?.includes(KEY_SEPARATOR)) {
    return genericBlock("action", service, raw, keyIn(raw, ["data", "data_template"]), id, context);
  }

  if ("condition" in raw) return conditionBlock(raw, id, context);

  return structuralBlock(raw, id, context) ?? unknownBlock("action", raw, id, context);
}

/** Delay, if, choose, repeat, … : HA tells them apart by the key they contain. */
function structuralBlock(raw: Raw, id: string, context: Context): DisplayBlock | null {
  const { texts } = context;
  const make = (kind: string): DisplayBlock =>
    baseBlock(
      "action",
      CLASSIC_ICON[kind] ?? iconForSection("action"),
      texts.titles[kind] ?? kind,
      id,
      raw,
    );
  /** A branch whose blocks all come from one list of the given section. */
  const branch = (label: string, section: BlockSection, key: string): DisplayBranch => {
    const path = join(id, key);
    const blocks =
      section === "condition"
        ? conditionBlocks(raw[key], path, context)
        : section === "trigger"
          ? triggerBlocks(raw[key], path, context)
          : actionBlocks(raw[key], path, context);

    return { label: texts.labels[label] ?? label, blocks, add: [addTarget(section, path)] };
  };

  if ("delay" in raw) {
    const block = make("delay");
    block.chips = unlabeled(valueChips(raw, ["delay"], "delay", id, context));
    return block;
  }

  if ("if" in raw) {
    const block = make("if");
    block.branches = [
      branch("if", "condition", "if"),
      branch("thenBranch", "action", "then"),
      ...(raw.else ? [branch("else", "action", "else")] : []),
    ];
    return block;
  }

  if ("choose" in raw) {
    const block = make("choose");
    const options = asList(raw.choose).map((option, index): DisplayBranch => {
      const optionPath = join(join(id, "choose"), index);
      const conditionsPath = join(optionPath, "conditions");
      const sequencePath = join(optionPath, "sequence");
      const conditions = conditionBlocks(asRecord(option).conditions, conditionsPath, context);
      const sequence = actionBlocks(asRecord(option).sequence, sequencePath, context);

      return {
        label: `${texts.labels.option ?? "option"} ${index + 1}`,
        blocks: [...conditions, ...sequence],
        add: [addTarget("condition", conditionsPath), addTarget("action", sequencePath)],
      };
    });
    const fallback = raw.default ? [branch("default", "action", "default")] : [];
    block.branches = [...options, ...fallback];
    return block;
  }

  return loopOrWaitBlock(raw, id, context, make, branch);
}

function loopOrWaitBlock(
  raw: Raw,
  id: string,
  context: Context,
  make: (kind: string) => DisplayBlock,
  branch: (label: string, section: BlockSection, key: string) => DisplayBranch,
): DisplayBlock | null {
  const { texts } = context;

  if ("repeat" in raw) {
    const repeat = asRecord(raw.repeat);
    const block = make("repeat");
    const sequencePath = join(id, "repeat.sequence");
    block.chips = valueChips(
      repeat,
      ["count", "while", "until", "for_each"],
      "repeat",
      join(id, "repeat"),
      context,
    );
    block.branches = [
      {
        label: texts.labels.sequence ?? "sequence",
        blocks: actionBlocks(repeat.sequence, sequencePath, context),
        add: [addTarget("action", sequencePath)],
      },
    ];
    return block;
  }

  if ("parallel" in raw || "sequence" in raw) {
    const kind = "parallel" in raw ? "parallel" : "sequence";
    const block = make(kind);
    block.branches = [branch(kind, "action", kind)];
    return block;
  }

  if ("wait_for_trigger" in raw || "wait_template" in raw) {
    const block = make("wait");
    block.chips = valueChips(raw, ["wait_template", "timeout"], "wait", id, context);
    block.addable = addableClassic(raw, ["timeout"], "wait", id, context);
    block.branches =
      "wait_for_trigger" in raw ? [branch("until", "trigger", "wait_for_trigger")] : [];
    return block;
  }

  if ("variables" in raw) {
    const block = make("variables");
    block.chips = Object.keys(asRecord(raw.variables)).map((name) => ({
      kind: "text",
      text: name,
    }));
    return block;
  }

  if ("stop" in raw) {
    const block = make("stop");
    block.chips = unlabeled([
      ...valueChips(raw, ["stop"], "stop", id, context),
      ...missingChips(raw, ["stop"], "stop", id, context),
    ]);
    return block;
  }

  if ("event" in raw) {
    const block = make("event");
    block.chips = unlabeled(valueChips(raw, ["event"], "event", id, context));
    return block;
  }

  if ("scene" in raw) {
    const block = baseBlock(
      "action",
      iconForKey("scene", "action"),
      texts.titles.scene ?? "scene",
      id,
      raw,
    );
    block.chips = [
      entityChip(raw.scene, [...parsePath(id), "scene"], ["scene"], false, false, context),
    ];
    return block;
  }

  return null;
}
