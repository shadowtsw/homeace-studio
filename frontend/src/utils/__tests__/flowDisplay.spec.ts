import { describe, expect, it } from "vitest";

import type { BlockChip, EditorCatalog, Flow } from "@/types/editor";

import { formatDuration, formatValue } from "../flow/formatValue";
import { toDisplayFlow, type FlowTexts } from "../flow/toDisplayFlow";

const texts: FlowTexts = {
  yes: "ja",
  no: "nein",
  hours: "h",
  minutes: "min",
  seconds: "s",
  titles: { state: "Zustand ändert sich", delay: "Warten", if: "Wenn", unknown: "Unbekannt" },
  labels: { to: "zu", for: "für", if: "wenn", thenBranch: "dann", else: "sonst" },
  choices: { sunset: "Sonnenuntergang" },
  entity: "Entität",
};

/** Chips without their edit info, for comparing what the view shows. */
const shown = (chips: BlockChip[] | undefined) =>
  chips?.map(({ kind, label, text }) => (label ? { kind, label, text } : { kind, text }));

const catalog: EditorCatalog = {
  triggers: {
    "button.pressed": { name: "Taste gedrückt", description: null, fields: {}, target: null },
    "zone.entered": {
      name: "Zone betreten",
      description: null,
      target: null,
      fields: {
        behavior: {
          name: "Auslösen, sobald",
          description: null,
          required: true,
          default: "each",
          selector: null,
        },
        for: {
          name: "Für mindestens",
          description: null,
          required: true,
          default: "00:00:00",
          selector: { duration: {} },
        },
        zone: { name: "Zone", description: null, required: true, selector: { entity: {} } },
      },
    },
  },
  conditions: {
    "switch.is_on": { name: "Schalter eingeschaltet", description: null, fields: {}, target: null },
  },
  actions: {
    "climate.set_temperature": {
      name: "Solltemperatur einstellen",
      description: null,
      target: null,
      fields: {
        temperature: {
          name: "Soll-Temperatur",
          description: null,
          required: false,
          selector: { number: { unit_of_measurement: "°C" } },
        },
      },
    },
  },
};

function automation(config: Record<string, unknown>): Flow {
  return {
    entityId: "automation.test",
    kind: "automation",
    config,
    entityNames: {
      "input_button.licht_aus": "Licht aus",
      "person.mara": "Mara",
      "zone.home": "Zuhause",
      "input_boolean.abwesend": "Abwesend",
      "climate.bad": "Heizung Bad",
    },
    isEditable: true,
  };
}

describe("formatDuration and formatValue", () => {
  it("writes durations short and skips zero parts", () => {
    expect(formatDuration("00:05:00", texts)).toBe("5 min");
    expect(formatDuration("01:30:15", texts)).toBe("1 h 30 min 15 s");
    expect(formatDuration({ minutes: 2 }, texts)).toBe("2 min");
    expect(formatDuration("00:00:00", texts)).toBe("0 s");
  });

  it("uses the selector: units for numbers, names for entities", () => {
    expect(formatValue(21.5, { number: { unit_of_measurement: "°C" } }, {}, texts)).toBe("21.5 °C");
    expect(formatValue("zone.home", { entity: {} }, { "zone.home": "Zuhause" }, texts)).toBe(
      "Zuhause",
    );
    expect(formatValue(true, null, {}, texts)).toBe("ja");
  });
});

describe("toDisplayFlow", () => {
  it("builds generic blocks from the catalog and leaves out fields at their default", () => {
    const flow = toDisplayFlow(
      automation({
        triggers: [
          {
            trigger: "button.pressed",
            target: { entity_id: "input_button.licht_aus" },
            options: {},
          },
          {
            trigger: "zone.entered",
            target: { entity_id: "person.mara" },
            options: { behavior: "each", for: "00:00:00", zone: "zone.home" },
          },
        ],
        conditions: [
          { condition: "switch.is_on", target: { entity_id: "input_boolean.abwesend" } },
        ],
        actions: [
          {
            action: "climate.set_temperature",
            target: { entity_id: "climate.bad" },
            data: { temperature: 21 },
          },
        ],
      }),
      catalog,
      texts,
    );

    expect(flow.triggers.map((block) => [block.title, shown(block.chips)])).toEqual([
      ["Taste gedrückt", [{ kind: "entity", text: "Licht aus" }]],
      [
        "Zone betreten",
        [
          { kind: "entity", text: "Mara" },
          { kind: "value", label: "Zone", text: "Zuhause" },
        ],
      ],
    ]);
    expect(flow.conditions[0]?.title).toBe("Schalter eingeschaltet");
    expect(shown(flow.actions[0]?.chips)).toEqual([
      { kind: "entity", text: "Heizung Bad" },
      { kind: "value", label: "Soll-Temperatur", text: "21 °C" },
    ]);
  });

  it("shows classic triggers, delays and if blocks with their branches", () => {
    const flow = toDisplayFlow(
      automation({
        triggers: [
          { trigger: "state", entity_id: "input_boolean.abwesend", to: "on", for: "00:05:00" },
        ],
        actions: [
          { delay: "00:00:30" },
          {
            if: [{ condition: "switch.is_on", target: { entity_id: "input_boolean.abwesend" } }],
            // HA itself names the branch of an if block "then"; this is real HA config.
            // oxlint-disable-next-line unicorn/no-thenable
            then: [{ action: "climate.set_temperature", data: { temperature: 18 } }],
          },
        ],
      }),
      catalog,
      texts,
    );

    expect(shown(flow.triggers[0]?.chips)).toEqual([
      { kind: "entity", text: "Abwesend" },
      { kind: "value", label: "zu", text: "on" },
      { kind: "value", label: "für", text: "5 min" },
    ]);
    expect(flow.actions[0]).toMatchObject({ title: "Warten", chips: [{ text: "30 s" }] });
    expect(flow.actions[1]?.branches.map((branch) => [branch.label, branch.blocks.length])).toEqual(
      [
        ["wenn", 1],
        ["dann", 1],
      ],
    );
    expect(flow.actions[1]?.branches[1]?.blocks[0]?.id).toBe("actions.1.then.0");
  });

  it("shows which states a state trigger leaves out", () => {
    // What a button dropped on "Wenn" becomes: never on dropping out or coming back
    const flow = toDisplayFlow(
      automation({
        triggers: [
          {
            trigger: "state",
            entity_id: "input_boolean.abwesend",
            not_from: ["unavailable", "unknown"],
            not_to: ["unavailable", "unknown"],
          },
        ],
      }),
      catalog,
      { ...texts, labels: { ...texts.labels, not_from: "nicht von", not_to: "nicht zu" } },
    );

    expect(shown(flow.triggers[0]?.chips)).toEqual([
      { kind: "entity", text: "Abwesend" },
      { kind: "value", label: "nicht von", text: "unavailable, unknown" },
      { kind: "value", label: "nicht zu", text: "unavailable, unknown" },
    ]);
  });

  it("shows floors, labels and what the target leaves out, and does not call them missing", () => {
    const withTarget: EditorCatalog = {
      ...catalog,
      actions: {
        "light.turn_off": {
          name: "Ausschalten",
          description: null,
          fields: {},
          target: { entity: [{ domain: ["light"] }] },
        },
      },
    };
    const flow = toDisplayFlow(
      {
        ...automation({
          actions: [
            {
              action: "light.turn_off",
              target: {
                floor_id: "eg",
                exclude: { area_id: "kueche", label_id: ["nacht", "unbekannt"] },
              },
            },
            { action: "light.turn_off", target: { label_id: "nacht" } },
            { action: "light.turn_off" },
          ],
        }),
        entityNames: { kueche: "Küche" },
      },
      withTarget,
      { ...texts, labels: { ...texts.labels, floor: "Etage", label: "Label", exclude: "ohne" } },
      { floors: { eg: "Erdgeschoss" }, labels: { nacht: "Nachtlicht" } },
    );

    expect(flow.actions.map((block) => shown(block.chips))).toEqual([
      [
        { kind: "entity", label: "Etage", text: "Erdgeschoss" },
        { kind: "entity", label: "ohne", text: "Küche, Nachtlicht, unbekannt" },
      ],
      [{ kind: "entity", label: "Label", text: "Nachtlicht" }],
      // Without any target the block still asks for one.
      [{ kind: "entity", text: "Entität" }],
    ]);
    expect(flow.actions[2]?.chips[0]?.isMissing).toBe(true);
  });

  it("keeps blocks it does not know as unknown, and marks disabled ones", () => {
    const flow = toDisplayFlow(
      automation({ actions: [{ some_future_key: true }, { delay: 5, enabled: false }] }),
      catalog,
      texts,
    );

    expect(flow.actions[0]).toMatchObject({ isUnknown: true, title: "Unbekannt" });
    expect(flow.actions[1]?.isDisabled).toBe(true);
  });

  it("titles a script call with the name of the script", () => {
    const flow = toDisplayFlow(
      {
        entityId: "script.x",
        kind: "script",
        config: { sequence: [{ action: "script.gute_nacht" }] },
        entityNames: { "script.gute_nacht": "Gute Nacht" },
        isEditable: true,
      },
      catalog,
      texts,
    );

    expect(flow.actions[0]).toMatchObject({ title: "Gute Nacht", icon: "mdi-script-text-outline" });
  });

  it("reads the sequence of a script", () => {
    const flow = toDisplayFlow(
      {
        entityId: "script.x",
        kind: "script",
        config: { sequence: [{ delay: 1 }] },
        entityNames: {},
        isEditable: true,
      },
      catalog,
      texts,
    );

    expect(flow.triggers).toEqual([]);
    expect(flow.actions).toHaveLength(1);
  });
});
