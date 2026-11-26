import { describe, expect, it } from "vitest";

import { dayLabel, runDuration } from "../runTime";

describe("runDuration", () => {
  it("is short and readable", () => {
    expect(runDuration({ seconds: 0.4, locale: "de" })).toBe("0,4 s");
    expect(runDuration({ seconds: 48.2, locale: "de" })).toBe("48 s");
    expect(runDuration({ seconds: 303, locale: "de" })).toBe("5 min 03 s");
    expect(runDuration({ seconds: 3900, locale: "de" })).toBe("1 h 05 min");
  });

  it("uses Russian units in Russian", () => {
    expect(runDuration({ seconds: 0.4, locale: "ru" })).toBe("0,4 с");
    expect(runDuration({ seconds: 303, locale: "ru" })).toBe("5 мин 03 с");
    expect(runDuration({ seconds: 3900, locale: "ru" })).toBe("1 ч 05 мин");
  });
});

describe("dayLabel", () => {
  const texts = { today: "Heute", yesterday: "Gestern" };
  const now = new Date(2026, 10, 21, 20, 0);

  it("says today and yesterday, the weekday within a week, else the date", () => {
    expect(
      dayLabel({ iso: new Date(2026, 10, 21, 0, 5).toISOString(), now, locale: "de", texts }),
    ).toBe("Heute");
    expect(
      dayLabel({ iso: new Date(2026, 10, 20, 23, 0).toISOString(), now, locale: "de", texts }),
    ).toBe("Gestern");
    expect(
      dayLabel({ iso: new Date(2026, 10, 18, 12, 0).toISOString(), now, locale: "de", texts }),
    ).toBe("Mittwoch");
    expect(
      dayLabel({ iso: new Date(2026, 9, 2, 12, 0).toISOString(), now, locale: "de", texts }),
    ).toBe("2. Oktober");
  });
});
