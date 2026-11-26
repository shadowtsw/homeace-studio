import { BadRequestException } from "@nestjs/common";

import { MemoryOverlayRepository } from "../demo/memory-overlay.repository";
import type { HaUser } from "./ha-user";
import { MAX_PREFERENCES_PER_USER, cleanPreferences, isPreferenceValue } from "./preference-values";
import { PreferencesService } from "./preferences.service";

const ALEX: HaUser = { id: "user-alex", name: "Alex" };
const SAM: HaUser = { id: "user-sam", name: "Sam" };

function createService(): PreferencesService {
  return new PreferencesService(new MemoryOverlayRepository({}));
}

describe("preference values", () => {
  it("keeps only plain, small values", () => {
    expect(isPreferenceValue(true)).toBe(true);
    expect(isPreferenceValue(20)).toBe(true);
    expect(isPreferenceValue("de")).toBe(true);
    expect(isPreferenceValue(Number.NaN)).toBe(false);
    expect(isPreferenceValue({ nav: 260 })).toBe(false);
    expect(isPreferenceValue("x".repeat(500))).toBe(false);
  });

  it("drops bad names and values when cleaning", () => {
    const clean = cleanPreferences({ locale: "de", "bad name": true, nested: { a: 1 } });

    expect(clean).toEqual({ locale: "de" });
    expect(cleanPreferences(["de"])).toEqual({});
    expect(cleanPreferences(null)).toEqual({});
  });
});

describe("PreferencesService", () => {
  it("has nothing for a first visit, and nothing without a user", async () => {
    const service = createService();

    expect(await service.read(ALEX)).toEqual({ user: ALEX, values: null });
    expect(await service.read(null)).toEqual({ user: null, values: null });
  });

  it("imports the first browser's values; a later device does not overwrite them", async () => {
    const service = createService();

    await service.importFirst({ user: ALEX, values: { technicalDetails: true, locale: "de" } });
    const afterSecondDevice = await service.importFirst({
      user: ALEX,
      values: { technicalDetails: false },
    });

    expect(afterSecondDevice).toEqual({ technicalDetails: true, locale: "de" });
  });

  it("sets one value and keeps the others, separately per user", async () => {
    const service = createService();
    await service.importFirst({ user: ALEX, values: { locale: "de", technicalDetails: true } });

    await service.set({ user: ALEX, name: "locale", value: "en" });
    await service.set({ user: SAM, name: "locale", value: "fr" });

    expect((await service.read(ALEX)).values).toEqual({ locale: "en", technicalDetails: true });
    expect((await service.read(SAM)).values).toEqual({ locale: "fr" });
  });

  it("refuses bad values and requests without a user", async () => {
    const service = createService();

    await expect(
      service.set({ user: ALEX, name: "locale", value: { lang: "de" } }),
    ).rejects.toThrow(BadRequestException);
    await expect(service.set({ user: ALEX, name: "bad name", value: true })).rejects.toThrow(
      BadRequestException,
    );
    await expect(service.set({ user: null, name: "locale", value: "de" })).rejects.toThrow(
      BadRequestException,
    );
    await expect(service.importFirst({ user: null, values: {} })).rejects.toThrow(
      BadRequestException,
    );
  });

  it("does not add more names once a user has the maximum", async () => {
    const service = createService();
    const many = Object.fromEntries(
      Array.from({ length: MAX_PREFERENCES_PER_USER }, (_, index) => [`setting${index}`, true]),
    );
    await service.importFirst({ user: ALEX, values: many });

    const after = await service.set({ user: ALEX, name: "oneMore", value: true });

    expect(after.oneMore).toBeUndefined();
    expect(Object.keys(after)).toHaveLength(MAX_PREFERENCES_PER_USER);
  });
});
