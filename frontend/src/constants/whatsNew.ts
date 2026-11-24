import type { AppLocale } from "@/i18n";

/** A text in every UI language; the type makes a missing language a build error. */
export type LocalizedText = Record<AppLocale, string>;

/** Where "Zeigen" takes the user. */
export type WhatsNewTarget = "settings";

export type WhatsNewItem = {
  /** MDI icon class, e.g. "mdi-gift-outline". */
  icon: string;
  title: LocalizedText;
  text: LocalizedText;
  show?: WhatsNewTarget;
};

export type WhatsNewRelease = {
  /** The release version, as in homeace-studio/config.yaml. */
  version: string;
  /** 3–6 highlights in plain words; the changelog has the rest. */
  items: WhatsNewItem[];
  /** Smaller changes not listed; shown as "… and N smaller improvements". */
  more?: number;
};

/** The browser key of the version whose highlights the user confirmed with "OK". */
export const WHATS_NEW_SEEN_KEY = "homeace.seenVersion";

/** Users of this version or older never saw "What's new"; their first update shows it. */
export const LAST_VERSION_WITHOUT_WHATS_NEW = "0.13.0";

/** All changes of every release, for "Alle Änderungen". */
export const RELEASES_URL = "https://github.com/shadowtsw/homeace-studio/releases";

/**
 * The highlights per release, newest first. Part of every release next to the changelog, written in
 * plain words for users and in every UI language (keys.spec.ts checks that the release version has
 * an entry).
 */
export const WHATS_NEW: readonly WhatsNewRelease[] = [
  {
    version: "0.14.0",
    items: [
      {
        icon: "mdi-gift-outline",
        title: {
          de: "Was ist neu",
          en: "What's new",
          fr: "Nouveautés",
          es: "Novedades",
          ru: "Что нового",
        },
        text: {
          de: "Nach einem Update zeigt das Geschenk oben rechts, was neu ist. Unter dem Zahnrad findest du es jederzeit wieder.",
          en: "After an update, the gift at the top right shows what is new. You can always find it again under the gear.",
          fr: "Après une mise à jour, le cadeau en haut à droite montre les nouveautés. Vous le retrouvez à tout moment sous l'engrenage.",
          es: "Tras una actualización, el regalo de arriba a la derecha muestra las novedades. Siempre puedes volver a encontrarlo en el engranaje.",
          ru: "После обновления подарок в правом верхнем углу показывает, что нового. Его всегда можно снова открыть через шестерёнку.",
        },
        show: "settings",
      },
    ],
  },
];
