import { describe, expect, it } from "vitest";

import type { DisplayBlock, DisplayFlow } from "@/types/editor";

import { branchesOf, dropTargets, nextBlockId } from "../dropTargets";

function block(id: string, overrides: Partial<DisplayBlock> = {}): DisplayBlock {
  return {
    id,
    section: "action",
    icon: "",
    title: id,
    chips: [],
    branches: [],
    position: { listPath: [], index: 0, count: 1 },
    isDisabled: false,
    addable: [],
    isUnknown: false,
    raw: {},
    ...overrides,
  };
}

// Dann: Wenn "Lawn moisture unter 20" → dann: Warte 30 min / sonst: (empty); then "Ventil schließen"
const condition = block("actions.0.if.0", {
  section: "condition",
  chips: [
    { kind: "entity", text: "Lawn moisture" },
    { kind: "value", label: "unter", text: "20" },
  ],
});
const ifBlock = block("actions.0", {
  title: "Wenn / Dann",
  branches: [
    {
      label: "Wenn",
      blocks: [condition],
      add: [{ section: "condition", listPath: ["actions", 0, "if"] }],
    },
    {
      label: "Dann",
      blocks: [block("actions.0.then.0")],
      add: [{ section: "action", listPath: ["actions", 0, "then"] }],
    },
    { label: "Sonst", blocks: [], add: [{ section: "action", listPath: ["actions", 0, "else"] }] },
  ],
});
const flow: DisplayFlow = {
  mode: "single",
  triggers: [],
  conditions: [],
  actions: [ifBlock, block("actions.1")],
  add: {
    triggers: { section: "trigger", listPath: ["triggers"] },
    conditions: { section: "condition", listPath: ["conditions"] },
    actions: { section: "action", listPath: ["actions"] },
  },
};

describe("drop targets of a flow", () => {
  it("lists the sections, then the branches of the same kind; a Wenn's own conditions are none", () => {
    const keys = dropTargets(flow).map((target) => target.key);

    expect(keys).toEqual([
      "trigger:triggers",
      "condition:conditions",
      "action:actions",
      "action:actions.0.then",
      "action:actions.0.else",
    ]);
  });

  it("names a branch by its condition, so 'Dann' of a Wenn is not the section 'Dann'", () => {
    const [then] = branchesOf(dropTargets(flow), "action");

    expect(then?.branch).toEqual({ label: "Dann", context: "Lawn moisture unter 20" });
    expect(branchesOf(dropTargets(flow), "trigger")).toEqual([]);
  });

  it("knows the id the new block gets at the end of its list", () => {
    const targets = dropTargets(flow);

    expect(nextBlockId(targets.find((target) => target.key === "action:actions")!)).toBe(
      "actions.2",
    );
    expect(nextBlockId(targets.find((target) => target.key === "action:actions.0.then")!)).toBe(
      "actions.0.then.1",
    );
  });
});
