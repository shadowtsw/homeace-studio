import { describe, expect, it } from "vitest";

import type { EditorCatalog, EntityOption } from "@/types/editor";

import { entityFit, sceneMisfit } from "../flow/entityBlocks";
import { isScriptStartBlock } from "../flow/scriptStart";

function entity(entityId: string, overrides: Partial<EntityOption> = {}): EntityOption {
  return {
    entityId,
    name: entityId,
    shortName: entityId,
    domain: entityId.split(".")[0] ?? "",
    state: "off",
    unit: null,
    deviceClass: null,
    options: null,
    deviceId: null,
    deviceName: null,
    areaId: null,
    areaName: null,
    labels: [],
    categoryPath: null,
    isInRegistry: true,
    ...overrides,
  };
}

const catalog: EditorCatalog = {
  triggers: {},
  conditions: {},
  actions: {
    "light.turn_on": { name: "Einschalten", fields: {} },
    "light.turn_off": { name: "Ausschalten", fields: {} },
    "climate.set_temperature": {
      name: "Zieltemperatur einstellen",
      fields: { hvac_mode: { required: true, default: "heat" } },
    },
  },
} as unknown as EditorCatalog;

const labels = (fit: ReturnType<typeof entityFit>) =>
  "choices" in fit ? fit.choices.map((choice) => choice.label) : fit;

describe("entity blocks", () => {
  it("offers a motion sensor on 'Wenn' as detected / no motion, with HA's states", () => {
    const motion = entity("binary_sensor.flur", { deviceClass: "motion" });
    const fit = entityFit(motion, "trigger", catalog);

    expect(labels(fit)).toEqual([{ key: "motionOn" }, { key: "motionOff" }]);
    expect("choices" in fit && fit.choices[0]?.item).toEqual({
      trigger: "state",
      entity_id: "binary_sensor.flur",
      to: "on",
    });
  });

  it("tells a door contact from a motion sensor and leaves out passing states", () => {
    const door = entity("binary_sensor.tuer", { deviceClass: "door" });
    const cover = entity("cover.markise");

    expect(labels(entityFit(door, "condition", catalog))).toEqual([
      { key: "isOpen" },
      { key: "isClosed" },
    ]);
    expect(labels(entityFit(cover, "trigger", catalog))).toEqual([
      { key: "opens" },
      { key: "closes" },
    ]);
  });

  it("starts a measured value's limit at what it shows now, so the block is valid at once", () => {
    const wind = entity("sensor.wind", { state: "12", unit: "km/h" });
    const fit = entityFit(wind, "trigger", catalog);

    expect("choices" in fit && fit.choices.map((choice) => choice.item)).toEqual([
      { trigger: "numeric_state", entity_id: "sensor.wind", above: 12 },
      { trigger: "numeric_state", entity_id: "sensor.wind", below: 12 },
    ]);
  });

  it("names unknown states as they are", () => {
    const select = entity("input_select.modus", { options: ["Tag", "Nacht"], state: "Tag" });

    expect(labels(entityFit(select, "condition", catalog))).toEqual([
      { key: "isState", params: { state: "Tag" } },
      { key: "isState", params: { state: "Nacht" } },
    ]);
  });

  it("offers only the actions HA describes, named by HA, with the target and HA's defaults", () => {
    const fit = entityFit(entity("light.flur"), "action", catalog);

    expect(labels(fit)).toEqual([{ text: "Einschalten" }, { text: "Ausschalten" }]);
    expect("choices" in fit && fit.choices[0]?.item).toEqual({
      action: "light.turn_on",
      target: { entity_id: "light.flur" },
    });

    const heating = entityFit(entity("climate.bad"), "action", catalog);
    expect("choices" in heating && heating.choices[0]?.item).toEqual({
      action: "climate.set_temperature",
      data: { hvac_mode: "heat" },
      target: { entity_id: "climate.bad" },
    });
  });

  it("says why sensors cannot be told to do anything", () => {
    expect(entityFit(entity("binary_sensor.flur"), "action", catalog)).toEqual({
      reason: "sensor",
    });
    expect(entityFit(entity("sensor.wind", { state: "3" }), "action", catalog)).toEqual({
      reason: "measure",
    });
    expect(entityFit(entity("weather.home"), "action", catalog)).toEqual({ reason: "noAction" });
  });

  it("treats helpers like devices: a switch turns on, a number has a limit", () => {
    const guests = entity("input_boolean.gaeste");
    const target = entity("input_number.soll", { state: "21.5" });

    expect(labels(entityFit(guests, "trigger", catalog))).toEqual([
      { key: "turnsOn" },
      { key: "turnsOff" },
    ]);
    expect("choices" in entityFit(target, "condition", catalog)).toBe(true);
    expect(labels(entityFit(target, "condition", catalog))).toEqual([
      { key: "isAbove" },
      { key: "isBelow" },
    ]);
  });

  it("lets a scene or a button fire, but has nothing to check", () => {
    const scene = entity("scene.abend", { state: "2026-11-25T20:00:00+00:00" });
    const fit = entityFit(scene, "trigger", catalog);

    expect(labels(fit)).toEqual([{ key: "fires" }]);
    expect("choices" in fit && fit.choices[0]?.item).toEqual({
      trigger: "state",
      entity_id: "scene.abend",
    });
    expect(entityFit(scene, "condition", catalog)).toEqual({ reason: "noCondition" });
  });

  it("offers automations only the actions HA describes", () => {
    const withAutomation = {
      ...catalog,
      actions: { ...catalog.actions, "automation.trigger": { name: "Ausführen", fields: {} } },
    } as unknown as EditorCatalog;

    expect(labels(entityFit(entity("automation.licht"), "action", withAutomation))).toEqual([
      { text: "Ausführen" },
    ]);
  });

  it("knows what a scene can hold", () => {
    expect(sceneMisfit(entity("light.flur"))).toBeNull();
    expect(sceneMisfit(entity("binary_sensor.flur"))).toBe("sceneSensor");
    expect(sceneMisfit(entity("sensor.wind"))).toBe("sceneMeasure");
    expect(sceneMisfit(entity("weather.home"))).toBe("sceneOther");
  });
  it("offers a script on 'Dann' as run and wait, or start without waiting", () => {
    const withStart = {
      ...catalog,
      actions: { ...catalog.actions, "script.turn_on": { name: "Einschalten", fields: {} } },
    } as unknown as EditorCatalog;
    const script = entity("script.gute_nacht_neu", { scriptKey: "gute_nacht" });
    const fit = entityFit(script, "action", withStart);

    expect(labels(fit)).toEqual([{ key: "runScript" }, { key: "startScript" }]);
    // Run: a direct call by the key in scripts.yaml, which waits
    expect("choices" in fit && fit.choices[0]?.item).toEqual({ action: "script.gute_nacht" });
    // Start: HA's script.turn_on with the script as target
    expect("choices" in fit && fit.choices[1]?.item).toMatchObject({
      action: "script.turn_on",
      target: { entity_id: "script.gute_nacht_neu" },
    });
    // Without a known key (a script just created), its object ID is the key
    const fresh = entityFit(entity("script.neu"), "action", catalog);
    expect("choices" in fresh && fresh.choices.map((choice) => choice.item)).toEqual([
      { action: "script.neu" },
    ]);
  });

  it("recognizes a block that starts a script without waiting, also in the old style", () => {
    expect(isScriptStartBlock({ action: "script.turn_on" })).toBe(true);
    expect(isScriptStartBlock({ service: "script.turn_on" })).toBe(true);
    expect(isScriptStartBlock({ action: "script.gute_nacht" })).toBe(false);
    expect(isScriptStartBlock(null)).toBe(false);
  });
});
