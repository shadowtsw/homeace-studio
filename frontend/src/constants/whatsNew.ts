import type { AppLocale } from "@/i18n";

/** A text in every UI language; the type makes a missing language a build error. */
export type LocalizedText = Record<AppLocale, string>;

/** Where "Zeigen" takes the user: the gear menu, or the helpers or scenes in the list. */
export type WhatsNewTarget = "settings" | "helpers" | "scenes" | "entities";

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
        icon: "mdi-palette-outline",
        title: {
          de: "Szenen bearbeiten, ohne dass das Licht umschaltet",
          en: "Edit scenes without your lights changing",
          fr: "Modifier les scènes sans que la lumière change",
          es: "Editar escenas sin que cambien las luces",
          ru: "Редактирование сцен без переключения света",
        },
        text: {
          de: "Helligkeit, Farbe, Rollläden und Heizung einfach einstellen und speichern, das Wohnzimmer bleibt, wie es ist. Sehen willst du es? „Vorschau“ oder „Ausprobieren“, danach ist alles wieder wie vorher.",
          en: "Set brightness, colour, covers and heating and save, while the living room stays as it is. Want to see it? “Preview” or “Try”, and afterwards everything is back to how it was.",
          fr: "Réglez luminosité, couleur, volets et chauffage puis enregistrez, le salon reste tel quel. Vous voulez voir ? « Aperçu » ou « Essayer », et ensuite tout redevient comme avant.",
          es: "Ajusta brillo, color, persianas y calefacción y guarda, mientras el salón se queda como está. ¿Quieres verlo? “Vista previa” o “Probar”, y después todo vuelve a estar como antes.",
          ru: "Настраивайте яркость, цвет, шторы и отопление и сохраняйте, а в гостиной ничего не меняется. Хотите увидеть? «Предпросмотр» или «Попробовать», а потом всё вернётся как было.",
        },
        show: "scenes",
      },
      {
        icon: "mdi-devices",
        title: {
          de: "Geräte in Ordnern, per Drag & Drop in Abläufe",
          en: "Devices in folders, dragged into flows",
          fr: "Les appareils dans des dossiers, glissés dans les déroulements",
          es: "Dispositivos en carpetas, arrastrados a los flujos",
          ru: "Устройства в папках и перетаскивание в логику",
        },
        text: {
          de: "Der neue Filter „Entitäten“ zeigt Lichter, Sensoren und Co. Zieh sie auf einen Ordner zum Einsortieren oder direkt in eine Automation: Aus dem Bewegungsmelder wird „Bewegung erkannt“, aus der Lampe „Einschalten“. Strg+Klick kombiniert Filter. Viele auf einmal? Einstellungen → Werkzeuge → „Entitäten einsortieren“ (Beta) schlägt passende Ordner vor.",
          en: "The new filter “Entities” shows lights, sensors and more. Drag them onto a folder to sort them, or straight into an automation: the motion sensor becomes “Motion detected”, the lamp “Turn on”. Ctrl+click combines filters. Lots of them? Settings → Tools → “Sort entities into folders” (beta) proposes fitting folders.",
          fr: "Le nouveau filtre « Entités » montre lumières, capteurs et le reste. Glissez-les sur un dossier pour les ranger, ou directement dans une automatisation : le détecteur de mouvement devient « Mouvement détecté », la lampe « Allumer ». Ctrl+clic combine les filtres. Beaucoup d'un coup ? Paramètres → Outils → « Classer les entités » (bêta) propose des dossiers adaptés.",
          es: "El nuevo filtro “Entidades” muestra luces, sensores y más. Arrástralos a una carpeta para ordenarlos, o directamente a una automatización: el sensor de movimiento se convierte en “Movimiento detectado”, la lámpara en “Encender”. Ctrl+clic combina filtros. ¿Muchas a la vez? Ajustes → Herramientas → “Ordenar entidades en carpetas” (beta) propone carpetas adecuadas.",
          ru: "Новый фильтр «Объекты» показывает свет, датчики и остальное. Перетащите их на папку, чтобы разложить, или прямо в автоматизацию: датчик движения станет «Обнаружено движение», лампа — «Включить». Ctrl+клик объединяет фильтры. Их много? Настройки → Инструменты → «Разложить объекты по папкам» (бета) предложит подходящие папки.",
        },
        show: "entities",
      },
      {
        icon: "mdi-tune-variant",
        title: {
          de: "Helfer einstellen",
          en: "Helper settings",
          fr: "Réglages des entrées",
          es: "Ajustes de los ayudantes",
          ru: "Настройки вспомогательных элементов",
        },
        text: {
          de: "Bereiche, Schritte, Optionen, Längen und Dauern direkt im Tab „Einstellungen“ ändern. Passt etwas nicht, sagt HomeAce es vor dem Speichern.",
          en: "Change ranges, steps, options, lengths and durations right in the “Settings” tab. If something does not fit, HomeAce says so before saving.",
          fr: "Modifiez plages, pas, options, longueurs et durées directement dans l'onglet « Réglages ». Si quelque chose ne va pas, HomeAce le signale avant l'enregistrement.",
          es: "Cambia rangos, pasos, opciones, longitudes y duraciones directamente en la pestaña “Ajustes”. Si algo no encaja, HomeAce lo avisa antes de guardar.",
          ru: "Меняйте диапазоны, шаги, варианты, длины и длительности прямо на вкладке «Настройки». Если что-то не так, HomeAce скажет об этом до сохранения.",
        },
        show: "helpers",
      },
      {
        icon: "mdi-content-copy",
        title: {
          de: "Helfer duplizieren",
          en: "Duplicate helpers",
          fr: "Dupliquer des entrées",
          es: "Duplicar ayudantes",
          ru: "Копирование вспомогательных элементов",
        },
        text: {
          de: "Das Kopie-Symbol hinter dem Stift gibt es jetzt auch für Helfer: mit Einstellungen, Ordner, Labels und Bereich. Der Wert startet neu.",
          en: "The copy icon next to the pencil now works for helpers too: with settings, folder, labels and area. The value starts fresh.",
          fr: "L'icône de copie à côté du crayon fonctionne désormais aussi pour les entrées : avec réglages, dossier, étiquettes et pièce. La valeur repart de zéro.",
          es: "El icono de copia junto al lápiz ahora también sirve para los ayudantes: con ajustes, carpeta, etiquetas y área. El valor empieza de nuevo.",
          ru: "Значок копирования рядом с карандашом теперь работает и для вспомогательных элементов: с настройками, папкой, метками и пространством. Значение начинается заново.",
        },
        show: "helpers",
      },
      {
        icon: "mdi-label-multiple-outline",
        title: {
          de: "Labels und Icons",
          en: "Labels and icons",
          fr: "Étiquettes et icônes",
          es: "Etiquetas e iconos",
          ru: "Метки и значки",
        },
        text: {
          de: "Labels anlegen, umbenennen, einfärben und vielen Einträgen auf einmal geben. Vor dem Löschen siehst du, wo ein Label noch gebraucht wird. Und neu: Icons aus Paketen wie custom-brand-icons zeigen und auswählen.",
          en: "Create, rename and colour labels and give them to many entries at once. Before deleting one, you see where it is still used. Also new: show and pick icons from packs like custom-brand-icons.",
          fr: "Créez, renommez et colorez des étiquettes et attribuez-les à de nombreuses entrées d'un coup. Avant d'en supprimer une, vous voyez où elle sert encore. Nouveau aussi : afficher et choisir des icônes de packs comme custom-brand-icons.",
          es: "Crea, renombra y colorea etiquetas y asígnalas a muchas entradas a la vez. Antes de eliminar una, ves dónde se sigue usando. También nuevo: mostrar y elegir iconos de paquetes como custom-brand-icons.",
          ru: "Создавайте, переименовывайте и раскрашивайте метки и назначайте их сразу многим элементам. Перед удалением видно, где метка ещё используется. А ещё: значки из пакетов вроде custom-brand-icons видны и доступны для выбора.",
        },
      },
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
