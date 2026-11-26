import { describe, expect, it } from "vitest";

import type { EditorCatalog, Flow } from "@/types/editor";

import { getAtPath, parsePath, setAtPath } from "../configPath";
import { listValue, numberValue, timeValue } from "../editValue";
import { joinDuration, splitDuration } from "../formatValue";
import { stateSuggestions } from "../stateSuggestions";
import { toDisplayFlow, type FlowTexts } from "../toDisplayFlow";
import { classicFieldEditor, editorForSelector } from "../valueEditors";

const texts: FlowTexts = {
  yes: "ja",
  no: "nein",
  hours: "h",
  minutes: "min",
  seconds: "s",
  titles: {},
  labels: { to: "zu", for: "für", event: "Ereignis", offset: "Versatz" },
  choices: { sunset: "Sonnenuntergang", sunrise: "Sonnenaufgang" },
  entity: "Entität",
};

const catalog: EditorCatalog = {
  triggers: {},
  conditions: {},
  actions: {
    "light.turn_on": {
      name: "Einschalten",
      description: null,
      target: { entity: [{ domain: ["light"] }] },
      fields: {
        brightness_pct: {
          name: "Helligkeit",
          description: null,
          required: false,
          selector: { number: { min: 0, max: 100, unit_of_measurement: "%" } },
        },
        transition: {
          name: "Übergang",
          description: null,
          required: false,
          selector: { number: { min: 0, max: 300 } },
        },
      },
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

describe("config paths", () => {
  it("parses block ids into paths with list indexes", () => {
    expect(parsePath("actions.2.then.0")).toEqual(["actions", 2, "then", 0]);
  });

  it("changes one value and leaves everything else as it was", () => {
    const unknownPart = { keep: { deep: true } };
    const config = { alias: "A", actions: [{ delay: 5, extra: unknownPart }], x: 1 };

    const changed = setAtPath({
      root: config,
      path: ["actions", 0, "delay"],
      value: 10,
    }) as typeof config;

    expect(changed).toEqual({ alias: "A", actions: [{ delay: 10, extra: unknownPart }], x: 1 });
    expect(changed.actions[0]?.extra).toBe(unknownPart);
    expect(config.actions[0]?.delay).toBe(5);
    expect(Object.keys(changed)).toEqual(["alias", "actions", "x"]);
  });

  it("removes keys with undefined and creates missing objects", () => {
    expect(setAtPath({ root: { a: { b: 1, c: 2 } }, path: ["a", "b"], value: undefined })).toEqual({
      a: { c: 2 },
    });
    expect(
      setAtPath({ root: { actions: [{}] }, path: ["actions", 0, "data", "x"], value: 1 }),
    ).toEqual({
      actions: [{ data: { x: 1 } }],
    });
  });

  it("treats a single item where HA allows a list as index 0", () => {
    const config = { triggers: { trigger: "state", to: "on" } };

    expect(setAtPath({ root: config, path: ["triggers", 0, "to"], value: "off" })).toEqual({
      triggers: { trigger: "state", to: "off" },
    });
    expect(getAtPath({ root: config, path: ["triggers", 0, "to"] })).toBe("on");
  });
});

describe("value editors", () => {
  it("follows HA's selector", () => {
    expect(
      editorForSelector({
        selector: { number: { min: 0, max: 100, unit_of_measurement: "%" } },
        value: 5,
      }),
    ).toEqual({ type: "number", min: 0, max: 100, step: undefined, unit: "%" });
    expect(
      editorForSelector({
        selector: { entity: { filter: [{ domain: "light" }] } },
        value: "light.a",
      }),
    ).toEqual({
      type: "entity",
      domains: ["light"],
      isMultiple: false,
    });
    expect(
      editorForSelector({
        selector: { select: { options: ["a", { value: "b", label: "B" }] } },
        value: "c",
      }),
    ).toEqual({
      type: "choice",
      options: [
        { value: "a", label: "a" },
        { value: "b", label: "B" },
        { value: "c", label: "c" },
      ],
      isMultiple: false,
    });
  });

  it("edits templates as templates and leaves objects alone", () => {
    expect(editorForSelector({ selector: { number: {} }, value: "{{ states('x') }}" })).toEqual({
      type: "template",
    });
    expect(editorForSelector({ selector: { object: {} }, value: { a: 1 } })).toBeNull();
  });

  it("knows the classic fields", () => {
    expect(
      classicFieldEditor({ field: "to", kind: "state", raw: { entity_id: "light.a" } }),
    ).toEqual({
      type: "text",
      isMultiline: false,
      stateOf: ["light.a"],
    });
    expect(classicFieldEditor({ field: "event", kind: "sun", raw: {} })).toMatchObject({
      type: "choice",
    });
    expect(
      classicFieldEditor({ field: "at", kind: "time", raw: { at: "input_datetime.wecker" } }),
    ).toBeNull();
    expect(classicFieldEditor({ field: "for", kind: "state", raw: {} })).toEqual({
      type: "duration",
    });
  });
});

describe("edit info in the flow view", () => {
  it("gives chips the exact path of their value, also in the old syntax", () => {
    const flow = toDisplayFlow({
      flow: automation({
        trigger: [{ platform: "state", entity_id: "light.a", to: "on" }],
        action: [
          {
            service: "light.turn_on",
            target: { entity_id: "light.a" },
            data: { brightness_pct: 50 },
          },
        ],
      }),
      catalog,
      texts,
    });

    expect(flow.triggers[0]?.chips.map((chip) => chip.edit?.path)).toEqual([
      ["trigger", 0, "entity_id"],
      ["trigger", 0, "to"],
    ]);
    expect(flow.actions[0]?.chips.map((chip) => chip.edit?.path)).toEqual([
      ["action", 0, "target", "entity_id"],
      ["action", 0, "data", "brightness_pct"],
    ]);
    expect(flow.actions[0]?.chips[1]?.edit).toMatchObject({
      title: "Helligkeit",
      value: 50,
      isRemovable: true,
    });
  });

  it("offers unset optional fields to add", () => {
    const flow = toDisplayFlow({
      flow: automation({
        triggers: [{ trigger: "sun", event: "sunset" }],
        actions: [{ action: "light.turn_on", data_template: { brightness_pct: 50 } }],
      }),
      catalog,
      texts,
    });

    expect(flow.triggers[0]?.chips[0]).toMatchObject({ text: "Sonnenuntergang" });
    expect(flow.triggers[0]?.addable.map((field) => field.path)).toEqual([
      ["triggers", 0, "offset"],
    ]);
    expect(flow.actions[0]?.addable.map((field) => field.title)).toEqual(["Übergang"]);
    expect(flow.actions[0]?.addable[0]?.path).toEqual([
      "actions",
      0,
      "data_template",
      "transition",
    ]);
  });

  it("edits a template condition shorthand in place", () => {
    const flow = toDisplayFlow({
      flow: automation({ conditions: ["{{ is_state('a', 'on') }}"] }),
      catalog,
      texts,
    });

    expect(flow.conditions[0]?.chips[0]?.edit).toMatchObject({
      path: ["conditions", 0],
      editor: { type: "template" },
    });
  });

  it("reads the mode and defaults to single", () => {
    expect(toDisplayFlow({ flow: automation({ mode: "restart" }), catalog, texts }).mode).toBe(
      "restart",
    );
    expect(toDisplayFlow({ flow: automation({}), catalog, texts }).mode).toBe("single");
  });
});

describe("turning input into config values", () => {
  it("keeps one entity a string unless it was a list", () => {
    expect(listValue({ selected: ["light.a"], original: "light.b" })).toBe("light.a");
    expect(listValue({ selected: ["light.a"], original: ["light.b"] })).toEqual(["light.a"]);
    expect(listValue({ selected: ["light.a", "light.b"], original: "light.b" })).toEqual([
      "light.a",
      "light.b",
    ]);
    expect(listValue({ selected: [], original: "light.b" })).toBeUndefined();
  });

  it("reads numbers, times and durations", () => {
    expect(numberValue("21,5")).toBe(21.5);
    expect(numberValue("")).toBeUndefined();
    expect(timeValue("7:30")).toBe("7:30:00");
    expect(splitDuration("01:30:15")).toEqual({ hours: 1, minutes: 30, seconds: 15 });
    expect(splitDuration(90)).toEqual({ hours: 0, minutes: 1, seconds: 30 });
    expect(splitDuration("{{ x }}")).toBeNull();
    expect(joinDuration({ hours: 0, minutes: 5, seconds: 0 })).toEqual({
      hours: 0,
      minutes: 5,
      seconds: 0,
    });
  });

  it("suggests states from options, the domain and the current state", () => {
    const extra = {
      unit: null,
      deviceClass: null,
      deviceId: null,
      deviceName: null,
      areaId: null,
      areaName: null,
      labels: [],
      categoryPath: null,
      isInRegistry: true,
    };
    const entities = [
      {
        ...extra,
        entityId: "input_select.modus",
        name: "Modus",
        shortName: "Modus",
        domain: "input_select",
        state: "Tag",
        options: ["Tag", "Nacht"],
      },
      {
        ...extra,
        entityId: "light.a",
        name: "A",
        shortName: "A",
        domain: "light",
        state: "on",
        options: null,
      },
    ];

    expect(stateSuggestions({ entityIds: ["input_select.modus"], entities })).toEqual([
      "Tag",
      "Nacht",
    ]);
    expect(stateSuggestions({ entityIds: ["light.a"], entities })).toEqual(["on", "off"]);
  });
});
