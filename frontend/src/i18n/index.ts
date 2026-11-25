import { createI18n } from "vue-i18n";

import { russianPluralRule } from "@/i18n/pluralRules";
import de from "@/locales/de";
import en from "@/locales/en";
import es from "@/locales/es";
import fr from "@/locales/fr";
import ru from "@/locales/ru";

export const APP_LOCALES = ["de", "en", "fr", "es", "ru"] as const;

export type AppLocale = (typeof APP_LOCALES)[number];

export const DEFAULT_LOCALE: AppLocale = "de";

/** Language names are shown in their own language, so they are not translated. */
export const LOCALE_NAMES: Record<AppLocale, string> = {
  de: "Deutsch",
  en: "English",
  fr: "Français",
  es: "Español",
  ru: "Русский",
};

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
  messages: { de, en, fr, es, ru },
  // French and Spanish use vue-i18n's own rule like English ("0 résultats"); only Russian needs its own.
  pluralRules: { ru: russianPluralRule },
});
