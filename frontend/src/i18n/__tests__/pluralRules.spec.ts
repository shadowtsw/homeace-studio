import { describe, expect, it } from "vitest";
import { createI18n } from "vue-i18n";

import { i18n, preferredLocale } from "@/i18n";
import { russianPluralRule } from "@/i18n/pluralRules";

const COUNTS = [0, 1, 2, 5, 11, 21, 22, 25, 111];

describe("russianPluralRule", () => {
  it("picks zero | 1 | 2–4 | 5+ from four forms", () => {
    expect(COUNTS.map((count) => russianPluralRule(count, 4))).toEqual([0, 1, 2, 3, 3, 1, 2, 3, 3]);
  });

  it("picks 1 | 2–4 | 5+ from three forms, 0 as 5+", () => {
    expect(COUNTS.map((count) => russianPluralRule(count, 3))).toEqual([2, 0, 1, 2, 2, 0, 1, 2, 2]);
  });

  it("works inside vue-i18n", () => {
    const i18n = createI18n({
      legacy: false,
      locale: "ru",
      messages: { ru: { files: "{count} файл | {count} файла | {count} файлов" } },
      pluralRules: { ru: russianPluralRule },
    });
    const { t } = i18n.global;

    expect([1, 3, 11, 0].map((count) => t("files", count))).toEqual([
      "1 файл",
      "3 файла",
      "11 файлов",
      "0 файлов",
    ]);
  });
});

describe("Russian texts of the app", () => {
  const t = (key: string, count: number): string =>
    i18n.global.t(key, { count }, { plural: count, locale: "ru" });

  it("use the right form", () => {
    expect([0, 1, 3, 5, 21].map((count) => t("toast.aiApplied", count))).toEqual([
      "Ничего не применено",
      "Применено 1 изменение",
      "Применено 3 изменения",
      "Применено 5 изменений",
      "Применено 21 изменение",
    ]);
    expect([0, 1, 2, 12].map((count) => t("picker.hits", count))).toEqual([
      "0 совпадений",
      "1 совпадение",
      "2 совпадения",
      "12 совпадений",
    ]);
  });

  it("show deps.more, called as t(key, n), with the count", () => {
    expect(i18n.global.t("deps.more", 1, { locale: "ru" })).toBe("ещё 1");
    expect(i18n.global.t("deps.more", 7, { locale: "ru" })).toBe("ещё 7");
  });
});

describe("preferredLocale", () => {
  it("takes the first browser language the app has", () => {
    expect(preferredLocale(["fr-FR", "ru-RU", "en"])).toBe("ru");
    expect(preferredLocale(["en-US", "de"])).toBe("en");
  });

  it("falls back to German", () => {
    expect(preferredLocale(["fr", "he"])).toBe("de");
    expect(preferredLocale([])).toBe("de");
  });
});
