import { describe, expect, it } from "vitest";

import { badOptionIndexes, helperSettingsProblem } from "@/utils/helperSettings";

describe("helperSettingsProblem", () => {
  it("accepts valid settings", () => {
    expect(helperSettingsProblem("input_number", { min: 0, max: 100, step: 5 })).toBeNull();
    expect(helperSettingsProblem("timer", { duration: "00:05:00" })).toBeNull();
    expect(helperSettingsProblem("input_boolean", {})).toBeNull();
  });

  it("names the problem and the fields to mark", () => {
    expect(helperSettingsProblem("input_number", { min: 50, max: 20, step: 1 })).toEqual({
      message: "minMax",
      fields: ["min", "max"],
    });
    expect(helperSettingsProblem("input_text", { min: 0, max: 300 })).toEqual({
      message: "textLimit",
      fields: ["max"],
    });
    expect(helperSettingsProblem("timer", { duration: "5 min" })?.fields).toEqual(["duration"]);
    expect(helperSettingsProblem("input_datetime", { hasDate: false, hasTime: false })).toEqual({
      message: "dateOrTime",
      fields: ["hasDate", "hasTime"],
    });
  });

  it("checks the options of a dropdown", () => {
    expect(helperSettingsProblem("input_select", { options: [] })?.message).toBe("optionsEmpty");
    expect(helperSettingsProblem("input_select", { options: ["a", " "] })?.message).toBe(
      "optionsBlank",
    );
    expect(helperSettingsProblem("input_select", { options: ["a", "a "] })?.message).toBe(
      "optionsTwice",
    );
  });

  it("leaves optional counter limits alone, but not a minimum above the maximum", () => {
    expect(helperSettingsProblem("counter", { step: 1, minimum: "", maximum: "" })).toBeNull();
    expect(helperSettingsProblem("counter", { step: 1, minimum: 5, maximum: 2 })?.message).toBe(
      "minimumMaximum",
    );
  });

  it("is never stricter than the backend: a counter start outside its range is fine", () => {
    expect(helperSettingsProblem("counter", { initial: 99, step: 1, maximum: 10 })).toBeNull();
  });
});

describe("badOptionIndexes", () => {
  it("marks empty options and both copies of a doubled one", () => {
    expect(badOptionIndexes(["a", "", "b", "a "])).toEqual([0, 1, 3]);
  });
});
