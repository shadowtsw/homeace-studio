import type { AppLocale } from "@/i18n";

/** A text in every UI language; the type makes a missing language a build error. */
export type LocalizedText = Record<AppLocale, string>;

/**
 * Where "Zeigen" takes the user: the settings window ("Über HomeAce" or "Aussehen"), or the
 * helpers, scenes or entities in the list.
 */
export type WhatsNewTarget = "settings" | "appearance" | "helpers" | "scenes" | "entities";

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
    version: "0.14.1",
    items: [
      {
        icon: "mdi-filter-outline",
        title: {
          de: "Aktive Filter fallen auf",
          en: "Active filters stand out",
          fr: "Les filtres actifs se remarquent",
          es: "Los filtros activos se notan",
          ru: "Активные фильтры заметны",
        },
        text: {
          de: "Ist nur ein Teil der Liste zu sehen, zeigt der Filter das jetzt mit einem farbigen Rand. Bleibt die Liste leer, steht dort, was der Filter ausblendet. „Alle zeigen“ holt alles zurück.",
          en: "When only part of the list is showing, the filter now has a coloured border. If the list stays empty, it tells you what the filter hides, and “Show all” brings everything back.",
          fr: "Quand seule une partie de la liste est visible, le filtre a maintenant une bordure colorée. Si la liste reste vide, elle indique ce que le filtre masque, et « Tout afficher » ramène tout.",
          es: "Cuando solo se ve una parte de la lista, el filtro tiene ahora un borde de color. Si la lista queda vacía, dice qué oculta el filtro, y “Mostrar todo” lo trae todo de vuelta.",
          ru: "Если видна только часть списка, у фильтра теперь цветная рамка. Если список пуст, в нём написано, что скрывает фильтр, а «Показать все» возвращает всё.",
        },
      },
      {
        icon: "mdi-folder-eye-outline",
        title: {
          de: "Blasse Ordner, klar erklärt",
          en: "Faded folders, clearly explained",
          fr: "Dossiers estompés, bien expliqués",
          es: "Carpetas atenuadas, bien explicadas",
          ru: "Бледные папки с пояснением",
        },
        text: {
          de: "Findet der Filter in einem Ordner nichts, ist der Ordner jetzt immer blass, auch wenn du ihn selbst angelegt hast. Gesperrt ist er nicht. Was die Navigation bei einem Filter zählt, erklärt „Zahlen und blasse Ordner“ unter Einstellungen → Gut zu wissen.",
          en: "A folder where the filter finds nothing is now always faded, also one you created yourself. It is not locked. “Numbers and faded folders” under Settings → Good to know explains what the navigation counts with a filter.",
          fr: "Un dossier où le filtre ne trouve rien est maintenant toujours estompé, même si vous l'avez créé vous-même. Il n'est pas verrouillé. « Nombres et dossiers estompés » sous Paramètres → Bon à savoir explique ce que la navigation compte avec un filtre.",
          es: "Una carpeta en la que el filtro no encuentra nada aparece ahora siempre atenuada, también si la creaste tú. No está bloqueada. “Números y carpetas atenuadas” en Ajustes → Conviene saber explica qué cuenta la navegación con un filtro.",
          ru: "Папка, в которой фильтр ничего не находит, теперь всегда бледная, даже если вы создали её сами. Она не заблокирована. Что считает навигация при фильтре, объясняет раздел «Числа и бледные папки» в Настройки → Полезно знать.",
        },
      },
      {
        icon: "mdi-thermometer",
        title: {
          de: "Zahlen und Einheiten wie in Home Assistant",
          en: "Numbers and units as in Home Assistant",
          fr: "Nombres et unités comme dans Home Assistant",
          es: "Números y unidades como en Home Assistant",
          ru: "Числа и единицы как в Home Assistant",
        },
        text: {
          de: "Thermostate zeigen im Szenen-Editor die Einheit, in der Home Assistant rechnet, also auch °F. Zahlen erscheinen wie in Home Assistant in deiner Sprache: 21,5 °C statt 21.5 °C.",
          en: "Thermostats in the scene editor show the unit Home Assistant uses, °F included. Numbers and percentages are written the way Home Assistant writes them in your language.",
          fr: "Dans l'éditeur de scènes, les thermostats affichent l'unité utilisée par Home Assistant, °F compris. Les nombres s'écrivent comme dans Home Assistant dans votre langue : 21,5 °C au lieu de 21.5 °C.",
          es: "En el editor de escenas, los termostatos muestran la unidad que usa Home Assistant, también °F. Los números se escriben como en Home Assistant en tu idioma: 21,5 °C y 25%.",
          ru: "В редакторе сцен термостаты показывают единицу, в которой считает Home Assistant, в том числе °F. Числа пишутся как в Home Assistant на вашем языке: 21,5 °C и 25%.",
        },
      },
    ],
    more: 1,
  },
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
          de: "Der neue Filter „Entitäten“ zeigt Lichter, Sensoren und Co. Zieh sie auf einen Ordner zum Einsortieren oder direkt in eine Automation: Aus dem Bewegungsmelder wird „Bewegung erkannt“, aus der Lampe „Einschalten“. Strg+Klick kombiniert Filter.",
          en: "The new filter “Entities” shows lights, sensors and more. Drag them onto a folder to sort them, or straight into an automation: the motion sensor becomes “Motion detected”, the lamp “Turn on”. Ctrl+click combines filters.",
          fr: "Le nouveau filtre « Entités » montre lumières, capteurs et le reste. Glissez-les sur un dossier pour les ranger, ou directement dans une automatisation : le détecteur de mouvement devient « Mouvement détecté », la lampe « Allumer ». Ctrl+clic combine les filtres.",
          es: "El nuevo filtro “Entidades” muestra luces, sensores y más. Arrástralos a una carpeta para ordenarlos, o directamente a una automatización: el sensor de movimiento se convierte en “Movimiento detectado”, la lámpara en “Encender”. Ctrl+clic combina filtros.",
          ru: "Новый фильтр «Объекты» показывает свет, датчики и остальное. Перетащите их на папку, чтобы разложить, или прямо в автоматизацию: датчик движения станет «Обнаружено движение», лампа — «Включить». Ctrl+клик объединяет фильтры.",
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
