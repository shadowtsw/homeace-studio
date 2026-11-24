import { createI18n } from "vue-i18n";

import { russianPluralRule } from "@/i18n/pluralRules";
import de from "@/locales/de";
import en from "@/locales/en";
import ru from "@/locales/ru";

export const APP_LOCALES = ["de", "en", "ru"] as const;

export type AppLocale = (typeof APP_LOCALES)[number];

export const DEFAULT_LOCALE: AppLocale = "de";

/** German is the source of truth; every other language must have the same keys. */
export type MessageSchema = typeof de;

/**
 * The first browser language the app has ("ru-RU" counts as "ru"), else the default.
 *
 * @param languages - Usually `navigator.languages`, most preferred first.
 */
export function preferredLocale(languages: readonly string[]): AppLocale {
  for (const language of languages) {
    const code = language.toLowerCase().split("-")[0];
    const match = APP_LOCALES.find((locale) => locale === code);
    if (match) return match;
  }
  return DEFAULT_LOCALE;
}

export const i18n = createI18n<[MessageSchema], AppLocale>({
  legacy: false,
  locale: DEFAULT_LOCALE,
  fallbackLocale: "en",
  messages: { de, en, ru },
  pluralRules: { ru: russianPluralRule },
});
