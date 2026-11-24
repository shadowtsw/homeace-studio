import { describe, expect, it } from "vitest";

import { dayLabel, runDuration } from "../runTime";

describe("runDuration", () => {
  it("is short and readable", () => {
    expect(runDuration(0.4, "de")).toBe("0,4 s");
    expect(runDuration(48.2, "de")).toBe("48 s");
    expect(runDuration(303, "de")).toBe("5 min 03 s");
    expect(runDuration(3900, "de")).toBe("1 h 05 min");
  });

  it("uses Russian units in Russian", () => {
    expect(runDuration(0.4, "ru")).toBe("0,4 с");
    expect(runDuration(303, "ru")).toBe("5 мин 03 с");
    expect(runDuration(3900, "ru")).toBe("1 ч 05 мин");
  });
});

describe("dayLabel", () => {
  const texts = { today: "Heute", yesterday: "Gestern" };
  const now = new Date(2026, 10, 21, 20, 0);

  it("says today and yesterday, the weekday within a week, else the date", () => {
    expect(dayLabel(new Date(2026, 10, 21, 0, 5).toISOString(), now, "de", texts)).toBe("Heute");
    expect(dayLabel(new Date(2026, 10, 20, 23, 0).toISOString(), now, "de", texts)).toBe("Gestern");
    expect(dayLabel(new Date(2026, 10, 18, 12, 0).toISOString(), now, "de", texts)).toBe(
      "Mittwoch",
    );
    expect(dayLabel(new Date(2026, 9, 2, 12, 0).toISOString(), now, "de", texts)).toBe(
      "2. Oktober",
    );
  });
});
