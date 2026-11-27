import { asRecord, isRecord } from "./record";

describe("isRecord", () => {
  it("is true for plain objects only", () => {
    expect(isRecord({})).toBe(true);
    expect(isRecord({ state: "on" })).toBe(true);

    expect(isRecord(null)).toBe(false);
    expect(isRecord(undefined)).toBe(false);
    expect(isRecord(["on"])).toBe(false);
    expect(isRecord("on")).toBe(false);
    expect(isRecord(1)).toBe(false);
  });
});

describe("asRecord", () => {
  it("keeps an object and gives an empty one for anything else", () => {
    const value = { entity_id: "light.kitchen" };

    expect(asRecord(value)).toBe(value);
    expect(asRecord(null)).toEqual({});
    expect(asRecord(["light.kitchen"])).toEqual({});
    expect(asRecord("light.kitchen")).toEqual({});
  });
});
