import type { BlockSection, DisplayBlock, DisplayBranch } from "@/types/editor";
import { asList } from "@/utils/list";
import { asRecord } from "@/utils/record";

import { CLASSIC_ICON, iconForKey, iconForSection } from "../blockIcons";
import { parsePath } from "../configPath";
import { genericBlock, unknownBlock } from "./blocks";
import {
  addTarget,
  asText,
  baseBlock,
  join,
  KEY_SEPARATOR,
  keyIn,
  listBlocks,
  unlabeled,
  type BlockListOptions,
  type BlockOptions,
} from "./context";
import { addableClassic, missingChips, valueChips } from "./fieldChips";
import { entityChip } from "./targetChips";
import { conditionBlock, conditionBlocks, triggerBlocks } from "./triggers";

/** A block of a hand-made kind ("delay", "if", …) without chips or branches yet. */
type MakeBlock = (kind: string) => DisplayBlock;

/** A branch whose blocks all come from one list of the given section. */
type MakeBranch = (options: { label: string; section: BlockSection; key: string }) => DisplayBranch;

/** Builds the blocks of a list by the section they belong to. */
const LIST_BUILDERS: Record<BlockSection, (options: BlockListOptions) => DisplayBlock[]> = {
  trigger: triggerBlocks,
  condition: conditionBlocks,
  action: actionBlocks,
};

export function actionBlocks({ value, path, context }: BlockListOptions): DisplayBlock[] {
  return listBlocks({
    value,
    path,
    build: ({ raw, id }) => actionBlock({ raw: asRecord(raw), id, context }),
  });
}

function actionBlock({ raw, id, context }: BlockOptions): DisplayBlock {
  const service = asText(raw.action) ?? asText(raw.service);

  if (service?.includes(KEY_SEPARATOR)) {
    return genericBlock({
      section: "action",
      key: service,
      raw,
      valuesKey: keyIn({ raw, keys: ["data", "data_template"] }),
      id,
      context,
    });
  }

  if ("condition" in raw) return conditionBlock({ value: raw, id, context });

  return (
    structuralBlock({ raw, id, context }) ?? unknownBlock({ section: "action", raw, id, context })
  );
}

/** Delay, if, choose, repeat, … : HA tells them apart by the key they contain. */
function structuralBlock({ raw, id, context }: BlockOptions): DisplayBlock | null {
  const { texts } = context;
  const make: MakeBlock = (kind) =>
    baseBlock({
      section: "action",
      icon: CLASSIC_ICON[kind] ?? iconForSection("action"),
      title: texts.titles[kind] ?? kind,
      id,
      raw,
    });
  const branch: MakeBranch = ({ label, section, key }) => {
    const path = join(id, key);
    const blocks = LIST_BUILDERS[section]({ value: raw[key], path, context });

    return { label: texts.labels[label] ?? label, blocks, add: [addTarget({ section, path })] };
  };

  if ("delay" in raw) {
    const block = make("delay");
    block.chips = unlabeled(valueChips({ raw, fields: ["delay"], kind: "delay", id, context }));
    return block;
  }

  if ("if" in raw) {
    const block = make("if");
    const elseBranches = raw.else
      ? [branch({ label: "else", section: "action", key: "else" })]
      : [];
    block.branches = [
      branch({ label: "if", section: "condition", key: "if" }),
      branch({ label: "thenBranch", section: "action", key: "then" }),
      ...elseBranches,
    ];
    return block;
  }

  if ("choose" in raw) {
    const block = make("choose");
    const options = asList(raw.choose).map((option, index): DisplayBranch => {
      const optionPath = join(join(id, "choose"), index);
      const conditionsPath = join(optionPath, "conditions");
      const sequencePath = join(optionPath, "sequence");
      const conditions = conditionBlocks({
        value: asRecord(option).conditions,
        path: conditionsPath,
        context,
      });
      const sequence = actionBlocks({
        value: asRecord(option).sequence,
        path: sequencePath,
        context,
      });

      return {
        label: `${texts.labels.option ?? "option"} ${index + 1}`,
        blocks: [...conditions, ...sequence],
        add: [
          addTarget({ section: "condition", path: conditionsPath }),
          addTarget({ section: "action", path: sequencePath }),
        ],
      };
    });
    const fallback = raw.default
      ? [branch({ label: "default", section: "action", key: "default" })]
      : [];
    block.branches = [...options, ...fallback];
    return block;
  }

  return loopOrWaitBlock({ raw, id, context, make, branch });
}

type LoopOrWaitBlockOptions = BlockOptions & {
  make: MakeBlock;
  branch: MakeBranch;
};

function loopOrWaitBlock({
  raw,
  id,
  context,
  make,
  branch,
}: LoopOrWaitBlockOptions): DisplayBlock | null {
  const { texts } = context;

  if ("repeat" in raw) {
    const repeat = asRecord(raw.repeat);
    const block = make("repeat");
    const repeatId = join(id, "repeat");
    const sequencePath = join(id, "repeat.sequence");
    block.chips = valueChips({
      raw: repeat,
      fields: ["count", "while", "until", "for_each"],
      kind: "repeat",
      id: repeatId,
      context,
    });
    block.branches = [
      {
        label: texts.labels.sequence ?? "sequence",
        blocks: actionBlocks({ value: repeat.sequence, path: sequencePath, context }),
        add: [addTarget({ section: "action", path: sequencePath })],
      },
    ];
    return block;
  }

  if ("parallel" in raw || "sequence" in raw) {
    const kind = "parallel" in raw ? "parallel" : "sequence";
    const block = make(kind);
    block.branches = [branch({ label: kind, section: "action", key: kind })];
    return block;
  }

  if ("wait_for_trigger" in raw || "wait_template" in raw) {
    const block = make("wait");
    const isWaitingForTrigger = "wait_for_trigger" in raw;
    block.chips = valueChips({
      raw,
      fields: ["wait_template", "timeout"],
      kind: "wait",
      id,
      context,
    });
    block.addable = addableClassic({ raw, fields: ["timeout"], kind: "wait", id, context });
    block.branches = isWaitingForTrigger
      ? [branch({ label: "until", section: "trigger", key: "wait_for_trigger" })]
      : [];
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
      ...valueChips({ raw, fields: ["stop"], kind: "stop", id, context }),
      ...missingChips({ raw, fields: ["stop"], kind: "stop", id, context }),
    ]);
    return block;
  }

  if ("event" in raw) {
    const block = make("event");
    block.chips = unlabeled(valueChips({ raw, fields: ["event"], kind: "event", id, context }));
    return block;
  }

  if ("scene" in raw) {
    const block = baseBlock({
      section: "action",
      icon: iconForKey({ key: "scene", section: "action" }),
      title: texts.titles.scene ?? "scene",
      id,
      raw,
    });
    const scenePath = [...parsePath(id), "scene"];
    block.chips = [
      entityChip({
        value: raw.scene,
        path: scenePath,
        domains: ["scene"],
        isMultiple: false,
        isRemovable: false,
        context,
      }),
    ];
    return block;
  }

  return null;
}
