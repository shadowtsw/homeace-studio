import { describe, expect, it } from "vitest";

import type { EditorCatalog, Flow } from "@/types/editor";

import { blockTypes, newBlock } from "../blockTypes";
import { applyFlowChange } from "../flowChanges";
import { toDisplayFlow, type FlowTexts } from "../toDisplayFlow";

const texts: FlowTexts = {
  yes: "ja",
  no: "nein",
  hours: "h",
  minutes: "min",
  seconds: "s",
  locale: "de",
  percent: (value) => `${value} %`,
  titles: { state: "Zustand ändert sich", state_condition: "Zustand ist", delay: "Warten" },
  labels: { at: "um", state: "ist", sequence: "Ablauf" },
  choices: {},
  entity: "Entität",
};

const catalog: EditorCatalog = {
  triggers: {
    "zone.entered": {
      name: "Zone betreten",
      description: null,
      target: { entity: [{ domain: ["person"] }] },
      fields: {
        behavior: {
          name: "Auslösen, sobald",
          description: null,
          required: true,
          default: "each",
          selector: null,
        },
        zone: { name: "Zone", description: null, required: true, selector: { entity: {} } },
      },
    },
  },
  conditions: {},
  actions: {
    "notify.send_message": {
      name: "Nachricht senden",
      description: null,
      target: null,
      fields: {},
    },
  },
};

function automation(config: Record<string, unknown>): Flow {
  return {
    entityId: "automation.x",
    kind: "automation",
    config,
    entityNames: {},
    isEditable: true,
  };
}

describe("applyFlowChange", () => {
  const config = { alias: "A", actions: [{ delay: 1 }, { delay: 2 }, { delay: 3 }] };

  it("moves, duplicates and removes blocks without touching the rest", () => {
    expect(
      applyFlowChange({ config, change: { type: "move", listPath: ["actions"], from: 2, to: 0 } }),
    ).toEqual({ alias: "A", actions: [{ delay: 3 }, { delay: 1 }, { delay: 2 }] });
    expect(
      applyFlowChange({ config, change: { type: "duplicate", listPath: ["actions"], index: 0 } })
        .actions,
    ).toEqual([{ delay: 1 }, { delay: 1 }, { delay: 2 }, { delay: 3 }]);
    expect(
      applyFlowChange({ config, change: { type: "remove", listPath: ["actions"], index: 1 } }),
    ).toEqual({
      alias: "A",
      actions: [{ delay: 1 }, { delay: 3 }],
    });
    expect(config.actions).toHaveLength(3);
  });

  it("ignores moves past either end", () => {
    expect(
      applyFlowChange({ config, change: { type: "move", listPath: ["actions"], from: 0, to: -1 } }),
    ).toBe(config);
  });

  it("disables with enabled: false and enables by removing the key", () => {
    const disabled = applyFlowChange({
      config,
      change: { type: "toggle", listPath: ["actions"], index: 0 },
    });

    expect(disabled.actions).toEqual([{ delay: 1, enabled: false }, { delay: 2 }, { delay: 3 }]);
    expect(
      applyFlowChange({
        config: disabled,
        change: { type: "toggle", listPath: ["actions"], index: 0 },
      }).actions,
    ).toEqual(config.actions);
  });

  it("writes the long form when disabling a template shorthand", () => {
    const changed = applyFlowChange({
      config: { conditions: ["{{ true }}"] },
      change: { type: "toggle", listPath: ["conditions"], index: 0 },
    });

    expect(changed.conditions).toEqual([
      { condition: "template", value_template: "{{ true }}", enabled: false },
    ]);
  });

  it("adds to missing lists and turns a single item into a list", () => {
    expect(
      applyFlowChange({
        config: {},
        change: { type: "insert", listPath: ["conditions"], item: { condition: "or" } },
      }),
    ).toEqual({ conditions: [{ condition: "or" }] });
    expect(
      applyFlowChange({
        config: { triggers: { trigger: "sun" } },
        change: { type: "insert", listPath: ["triggers"], item: { trigger: "time" } },
      }),
    ).toEqual({ triggers: [{ trigger: "sun" }, { trigger: "time" }] });
  });
});

describe("block types and new blocks", () => {
  it("offers hand-made types first, then HA's catalog by name", () => {
    const types = blockTypes({ section: "condition", catalog, titles: texts.titles });

    expect(types[0]).toMatchObject({ key: "state", label: "Zustand ist", isClassic: true });
    const actions = blockTypes({ section: "action", catalog, titles: texts.titles });

    expect(actions[actions.length - 1]).toMatchObject({
      key: "notify.send_message",
      isClassic: false,
    });
  });

  it("fills required fields that have a default, like HA's editor", () => {
    const type = blockTypes({ section: "trigger", catalog, titles: texts.titles }).find(
      (item) => item.key === "zone.entered",
    );

    expect(type && newBlock({ section: "trigger", type, catalog })).toEqual({
      trigger: "zone.entered",
      options: { behavior: "each" },
    });
  });
});

describe("block positions, add targets and missing values", () => {
  it("tells every block where it sits and where new ones go", () => {
    const flow = toDisplayFlow({
      flow: automation({
        trigger: [{ trigger: "time", at: "07:00:00" }],
        // HA itself names the branch of an if block "then"; this is real HA config.
        // oxlint-disable-next-line unicorn/no-thenable
        actions: [{ delay: 1 }, { if: [], then: [{ delay: 2 }] }],
      }),
      catalog,
      texts,
    });

    expect(flow.add.triggers.listPath).toEqual(["trigger"]);
    expect(flow.add.conditions.listPath).toEqual(["conditions"]);
    expect(flow.actions[1]?.position).toEqual({ listPath: ["actions"], index: 1, count: 2 });
    expect(flow.actions[1]?.branches.map((branch) => branch.add)).toEqual([
      [{ section: "condition", listPath: ["actions", 1, "if"] }],
      [{ section: "action", listPath: ["actions", 1, "then"] }],
    ]);
    expect(flow.actions[1]?.branches[1]?.blocks[0]?.position.listPath).toEqual([
      "actions",
      1,
      "then",
    ]);
  });

  it("asks for required values of new blocks", () => {
    const flow = toDisplayFlow({
      flow: automation({
        triggers: [{ trigger: "zone.entered", options: { behavior: "each" } }, { trigger: "time" }],
        conditions: [{ condition: "state" }],
      }),
      catalog,
      texts,
    });

    expect(
      flow.triggers[0]?.chips.map((chip) => [chip.text, chip.isMissing, chip.edit?.path]),
    ).toEqual([
      ["Entität", true, ["triggers", 0, "target", "entity_id"]],
      ["Zone", true, ["triggers", 0, "options", "zone"]],
    ]);
    expect(flow.triggers[1]?.chips).toMatchObject([{ text: "um", isMissing: true }]);
    expect(flow.conditions[0]).toMatchObject({
      title: "Zustand ist",
      chips: [
        { text: "Entität", isMissing: true },
        { text: "ist", isMissing: true },
      ],
    });
  });
});
