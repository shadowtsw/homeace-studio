import { describe, expect, it } from "vitest";

import { badOptionIndexes, helperSettingsProblem } from "@/utils/helperSettings";

describe("helperSettingsProblem", () => {
  it("accepts valid settings", () => {
    expect(
      helperSettingsProblem({ type: "input_number", settings: { min: 0, max: 100, step: 5 } }),
    ).toBeNull();
    expect(helperSettingsProblem({ type: "timer", settings: { duration: "00:05:00" } })).toBeNull();
    expect(helperSettingsProblem({ type: "input_boolean", settings: {} })).toBeNull();
  });

  it("names the problem and the fields to mark", () => {
    expect(
      helperSettingsProblem({ type: "input_number", settings: { min: 50, max: 20, step: 1 } }),
    ).toEqual({
      message: "minMax",
      fields: ["min", "max"],
    });
    expect(helperSettingsProblem({ type: "input_text", settings: { min: 0, max: 300 } })).toEqual({
      message: "textLimit",
      fields: ["max"],
    });
    expect(
      helperSettingsProblem({ type: "timer", settings: { duration: "5 min" } })?.fields,
    ).toEqual(["duration"]);
    expect(
      helperSettingsProblem({
        type: "input_datetime",
        settings: { hasDate: false, hasTime: false },
      }),
    ).toEqual({
      message: "dateOrTime",
      fields: ["hasDate", "hasTime"],
    });
  });

  it("checks the options of a dropdown", () => {
    expect(
      helperSettingsProblem({ type: "input_select", settings: { options: [] } })?.message,
    ).toBe("optionsEmpty");
    expect(
      helperSettingsProblem({ type: "input_select", settings: { options: ["a", " "] } })?.message,
    ).toBe("optionsBlank");
    expect(
      helperSettingsProblem({ type: "input_select", settings: { options: ["a", "a "] } })?.message,
    ).toBe("optionsTwice");
  });

  it("leaves optional counter limits alone, but not a minimum above the maximum", () => {
    expect(
      helperSettingsProblem({ type: "counter", settings: { step: 1, minimum: "", maximum: "" } }),
    ).toBeNull();
    expect(
      helperSettingsProblem({ type: "counter", settings: { step: 1, minimum: 5, maximum: 2 } })
        ?.message,
    ).toBe("minimumMaximum");
  });

  it("is never stricter than the backend: a counter start outside its range is fine", () => {
    expect(
      helperSettingsProblem({ type: "counter", settings: { initial: 99, step: 1, maximum: 10 } }),
    ).toBeNull();
  });
});

describe("badOptionIndexes", () => {
  it("marks empty options and both copies of a doubled one", () => {
    expect(badOptionIndexes(["a", "", "b", "a "])).toEqual([0, 1, 3]);
  });
});
