import { describe, expect, it } from "vitest";

import type { Entry } from "@/types/entry";

import {
  canDelete,
  canDuplicate,
  canToggle,
  hasEditableSettings,
  supportsAction,
  toggleAction,
} from "../entryActions";

function entry(overrides: Partial<Entry>): Entry {
  return {
    entityId: "automation.licht",
    kind: "automation",
    domain: "automation",
    name: "Licht",
    icon: null,
    categoryId: null,
    categoryPath: null,
    labels: [],
    area: null,
    state: "on",
    isDisabled: false,
    isHidden: false,
    isInRegistry: true,
    isFavorite: false,
    note: null,
    ...overrides,
  };
}

describe("entry actions", () => {
  it("offers a switch for automations and toggles, and runs for scripts, scenes and buttons", () => {
    expect(canToggle(entry({}))).toBe(true);
    expect(canToggle(entry({ domain: "input_boolean" }))).toBe(true);
    expect(canToggle(entry({ domain: "scene" }))).toBe(false);
    expect(supportsAction({ entry: entry({ domain: "scene" }), action: "run" })).toBe(true);
    expect(supportsAction({ entry: entry({ domain: "input_button" }), action: "run" })).toBe(true);
    expect(supportsAction({ entry: entry({ domain: "input_number" }), action: "run" })).toBe(false);
  });

  it("offers nothing for disabled entities", () => {
    expect(canToggle(entry({ isDisabled: true }))).toBe(false);
    expect(supportsAction({ entry: entry({ isDisabled: true }), action: "run" })).toBe(false);
  });

  it("switches off what is on and on what is off", () => {
    expect(toggleAction(entry({ state: "on" }))).toBe("turnOff");
    expect(toggleAction(entry({ state: "off" }))).toBe("turnOn");
  });

  it("deletes storage helpers, automations and scripts that are in the registry", () => {
    expect(canDelete(entry({ domain: "input_boolean" }))).toBe(true);
    expect(canDelete(entry({ domain: "automation" }))).toBe(true);
    expect(canDelete(entry({ domain: "script" }))).toBe(true);
    expect(canDelete(entry({ domain: "sensor" }))).toBe(false);
    expect(canDelete(entry({ domain: "scene" }))).toBe(false);
    expect(canDelete(entry({ domain: "input_boolean", isInRegistry: false }))).toBe(false);
    expect(canDelete(entry({ domain: "automation", isInRegistry: false }))).toBe(false);
  });
});

describe("canDuplicate and hasEditableSettings", () => {
  it("copy automations, scripts and storage helpers, not scenes or template helpers", () => {
    expect(canDuplicate(entry({ domain: "automation" }))).toBe(true);
    expect(canDuplicate(entry({ domain: "counter" }))).toBe(true);
    expect(canDuplicate(entry({ domain: "scene" }))).toBe(false);
    expect(canDuplicate(entry({ domain: "sensor" }))).toBe(false);
    expect(canDuplicate(entry({ domain: "input_number", isInRegistry: false }))).toBe(false);
  });

  it("edit the settings of storage helpers only", () => {
    expect(hasEditableSettings(entry({ domain: "timer" }))).toBe(true);
    expect(hasEditableSettings(entry({ domain: "sensor" }))).toBe(false);
  });
});
