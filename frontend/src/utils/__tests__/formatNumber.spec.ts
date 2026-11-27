import { describe, expect, it } from "vitest";

import { formatNumber, formatWithUnit } from "../formatNumber";

const germanPercent = (value: string): string => `${value} %`;
const englishPercent = (value: string): string => `${value}%`;

describe("formatNumber", () => {
  it("writes decimals and thousands the way the UI language does", () => {
    expect(formatNumber({ value: "21.5", locale: "de" })).toBe("21,5");
    expect(formatNumber({ value: "21.5", locale: "en" })).toBe("21.5");
    expect(formatNumber({ value: 1527, locale: "de" })).toBe("1.527");
    expect(formatNumber({ value: 1527, locale: "en" })).toBe("1,527");
    expect(formatNumber({ value: "-3.25", locale: "fr" })).toBe("-3,25");
  });

  it("keeps the decimals HA sent, without rounding", () => {
    expect(formatNumber({ value: "21.50", locale: "de" })).toBe("21,50");
    expect(formatNumber({ value: "0.125", locale: "de" })).toBe("0,125");
    expect(formatNumber({ value: "22", locale: "de" })).toBe("22");
  });

  it("leaves anything that is no plain number as it is", () => {
    for (const value of ["unavailable", "1e3", "21,5", "", "0x10", "12345678901234567"]) {
      expect(formatNumber({ value, locale: "de" })).toBe(value);
    }
  });
});

describe("formatWithUnit", () => {
  it("puts the unit after the formatted number", () => {
    expect(
      formatWithUnit({ value: "21.5", unit: "°C", locale: "de", percent: germanPercent }),
    ).toBe("21,5 °C");
    expect(formatWithUnit({ value: 70, unit: "°F", locale: "en", percent: englishPercent })).toBe(
      "70 °F",
    );
  });

  it("writes percent the way the language does", () => {
    expect(formatWithUnit({ value: "85", unit: "%", locale: "de", percent: germanPercent })).toBe(
      "85 %",
    );
    expect(formatWithUnit({ value: "85", unit: "%", locale: "en", percent: englishPercent })).toBe(
      "85%",
    );
  });
});
