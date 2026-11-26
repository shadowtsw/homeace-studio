import { describe, expect, it } from "vitest";

import type { BlockChip, DisplayBlock, DisplayFlow } from "@/types/editor";

import { markGoneChips } from "../markGoneChips";

function entityChip(value: unknown): BlockChip {
  return {
    kind: "entity",
    text: String(value),
    edit: {
      path: ["x"],
      title: "Entity",
      editor: { type: "entity", domains: [], isMultiple: Array.isArray(value) },
      value,
      isRemovable: false,
    },
  };
}

function block(chips: BlockChip[], inner: DisplayBlock[] = []): DisplayBlock {
  return {
    id: "b",
    section: "action",
    icon: "",
    title: "",
    chips,
    branches: inner.length ? [{ label: "then", blocks: inner, add: [] }] : [],
  } as unknown as DisplayBlock;
}

const FLOW = {
  mode: "single",
  triggers: [block([entityChip("binary_sensor.weg")])],
  conditions: [],
  actions: [block([entityChip(["light.ok", "light.weg"])], [block([entityChip("light.ok")])])],
} as unknown as DisplayFlow;

describe("gone chips", () => {
  it("marks chips that name a removed entity, also in lists and nested blocks", () => {
    const marked = markGoneChips(FLOW, new Set(["binary_sensor.weg", "light.weg"]));

    expect(marked.triggers[0]?.chips[0]?.isGone).toBe(true);
    expect(marked.actions[0]?.chips[0]?.isGone).toBe(true);
    expect(marked.actions[0]?.branches[0]?.blocks[0]?.chips[0]?.isGone).toBeUndefined();
  });

  it("leaves the flow untouched when nothing is gone", () => {
    expect(markGoneChips(FLOW, new Set())).toBe(FLOW);
  });
});
