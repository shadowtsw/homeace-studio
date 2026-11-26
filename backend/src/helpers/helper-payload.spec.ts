import {
  buildCopyPayload,
  buildHelperPayload,
  buildUpdatePayload,
  helperSettingsOf,
  HelperSettingsError,
} from "./helper-payload";

function fieldOf(action: () => unknown): string | null {
  try {
    action();
    return null;
  } catch (error) {
    return error instanceof HelperSettingsError ? error.field : "unexpected error";
  }
}

describe("buildHelperPayload", () => {
  it("sends only name and icon for a toggle", () => {
    expect(
      buildHelperPayload({
        type: "input_boolean",
        name: "Gästemodus",
        icon: "mdi:account",
        settings: {},
      }),
    ).toEqual({
      name: "Gästemodus",
      icon: "mdi:account",
    });
  });

  it("maps input_number settings to HA names and fills defaults", () => {
    const payload = buildHelperPayload({
      type: "input_number",
      name: "Helligkeit",
      icon: undefined,
      settings: {
        min: 10,
        max: 100,
        unitOfMeasurement: "%",
      },
    });

    expect(payload).toEqual({
      name: "Helligkeit",
      min: 10,
      max: 100,
      step: 1,
      mode: "slider",
      unit_of_measurement: "%",
    });
  });

  it("rejects an input_number whose max is not above min", () => {
    expect(
      fieldOf(() =>
        buildHelperPayload({
          type: "input_number",
          name: "X",
          icon: undefined,
          settings: { min: 5, max: 5 },
        }),
      ),
    ).toBe("max");
    expect(
      fieldOf(() =>
        buildHelperPayload({
          type: "input_number",
          name: "X",
          icon: undefined,
          settings: { max: 5 },
        }),
      ),
    ).toBe("min");
  });

  it("trims select options and rejects empty, blank or duplicate lists", () => {
    const payload = buildHelperPayload({
      type: "input_select",
      name: "Status",
      icon: undefined,
      settings: {
        options: [" Aus ", "Läuft"],
      },
    });

    expect(payload.options).toEqual(["Aus", "Läuft"]);
    expect(
      fieldOf(() =>
        buildHelperPayload({
          type: "input_select",
          name: "X",
          icon: undefined,
          settings: { options: [] },
        }),
      ),
    ).toBe("options");
    expect(
      fieldOf(() =>
        buildHelperPayload({
          type: "input_select",
          name: "X",
          icon: undefined,
          settings: { options: ["a", "a"] },
        }),
      ),
    ).toBe("options");
  });

  it("needs date or time for input_datetime", () => {
    const settings = { hasDate: false, hasTime: false };

    expect(
      fieldOf(() =>
        buildHelperPayload({ type: "input_datetime", name: "X", icon: undefined, settings }),
      ),
    ).toBe("hasDate");
  });

  it("checks counter limits and timer durations", () => {
    expect(
      buildHelperPayload({
        type: "counter",
        name: "Zähler",
        icon: undefined,
        settings: { minimum: 0, maximum: 10 },
      }),
    ).toMatchObject({ initial: 0, step: 1, restore: true, minimum: 0, maximum: 10 });
    expect(
      fieldOf(() =>
        buildHelperPayload({
          type: "counter",
          name: "X",
          icon: undefined,
          settings: { minimum: 5, maximum: 1 },
        }),
      ),
    ).toBe("maximum");
    expect(
      buildHelperPayload({
        type: "timer",
        name: "Nachlauf",
        icon: undefined,
        settings: { duration: "0:05:00" },
      }),
    ).toEqual({
      name: "Nachlauf",
      duration: "0:05:00",
      restore: false,
    });
    expect(
      fieldOf(() =>
        buildHelperPayload({
          type: "timer",
          name: "X",
          icon: undefined,
          settings: { duration: "5 min" },
        }),
      ),
    ).toBe("duration");
  });
});

describe("helperSettingsOf", () => {
  it("turns a stored helper into the form's settings, empty strings for unset fields", () => {
    expect(
      helperSettingsOf({ type: "counter", item: { id: "c", name: "C", initial: 2, step: 1 } }),
    ).toEqual({
      initial: 2,
      step: 1,
      minimum: "",
      maximum: "",
      restore: true,
    });
    expect(
      helperSettingsOf({ type: "input_datetime", item: { has_date: false, has_time: true } }),
    ).toEqual({
      hasDate: false,
      hasTime: true,
    });
  });

  it("shows HA's timer durations with two hour digits", () => {
    expect(
      helperSettingsOf({ type: "timer", item: { duration: "0:05:00", restore: true } }),
    ).toEqual({
      duration: "00:05:00",
      restore: true,
    });
  });

  it("round-trips: what it reads builds the same payload again", () => {
    const stored = { min: 0, max: 255, mode: "password", pattern: "[a-z]*" };
    const settings = helperSettingsOf({ type: "input_text", item: stored });

    expect(buildUpdatePayload({ type: "input_text", stored, settings })).toEqual(stored);
  });
});

describe("buildUpdatePayload", () => {
  it("keeps what the form does not edit and leaves out the storage id", () => {
    const stored = { id: "x", name: "X", icon: "mdi:x", min: 0, max: 10, step: 1, initial: 4 };

    expect(
      buildUpdatePayload({
        type: "input_number",
        stored,
        settings: { min: 1, max: 9, step: 1, mode: "box" },
      }),
    ).toEqual({ name: "X", icon: "mdi:x", initial: 4, min: 1, max: 9, step: 1, mode: "box" });
  });

  it("removes an optional field the user cleared", () => {
    const stored = {
      name: "X",
      min: 0,
      max: 10,
      step: 1,
      mode: "slider",
      unit_of_measurement: "%",
    };
    const payload = buildUpdatePayload({
      type: "input_number",
      stored,
      settings: {
        min: 0,
        max: 10,
        step: 1,
        mode: "slider",
        unitOfMeasurement: "",
      },
    });

    expect(payload).not.toHaveProperty("unit_of_measurement");
  });

  it("checks the settings like creating does", () => {
    expect(() =>
      buildUpdatePayload({ type: "timer", stored: { name: "T" }, settings: { duration: "5 min" } }),
    ).toThrow(HelperSettingsError);
  });
});

describe("buildCopyPayload", () => {
  it("takes everything but the id, with the new name", () => {
    expect(
      buildCopyPayload({ stored: { id: "a", name: "A", options: ["x", "y"] }, name: "A (Kopie)" }),
    ).toEqual({
      name: "A (Kopie)",
      options: ["x", "y"],
    });
  });
});
