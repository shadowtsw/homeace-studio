import type { Catalog } from "./catalog";

/** German texts. Placeholders like `{path}` are filled from `data.params`. */
export const CATALOG_DE: Catalog = {
  OK: "Erledigt.",
  CREATED: "Angelegt.",
  VALIDATION_FAILED: "Die Eingaben sind nicht gültig.",
  NOT_FOUND: "Nicht gefunden.",
  CONFLICT: "Die Aktion steht im Konflikt mit dem aktuellen Stand.",
  REQUEST_FAILED: "Die Anfrage konnte nicht verarbeitet werden.",
  INTERNAL_ERROR: "Ein unerwarteter Fehler ist aufgetreten.",

  INVALID_VALUE: "Ungültiger Wert.",
  IS_NOT_EMPTY: "Darf nicht leer sein.",
  IS_STRING: "Muss ein Text sein.",
  MIN_LENGTH: "Text ist zu kurz.",
  MAX_LENGTH: "Text ist zu lang.",
  IS_IN: "Dieser Wert ist nicht erlaubt.",
  IS_OBJECT: "Ungültiger Aufbau.",
  IS_BOOLEAN: "Muss ja oder nein sein.",
  IS_ARRAY: "Muss eine Liste sein.",
  MATCHES: "Hat nicht das erwartete Format.",

  ENTRY_NOT_FOUND: "Den Eintrag {entityId} gibt es in Home Assistant nicht.",
  ENTRY_RENAMED: "Entity-ID geändert.",
  ENTRY_DUPLICATED: "Kopie angelegt.",
  ENTRY_ID_INVALID:
    "„{entityId}“ geht als Entity-ID nicht: nur Kleinbuchstaben, Ziffern und _, Bereich wie bisher.",
  ENTRY_ID_TAKEN: "Die Entity-ID „{entityId}“ gibt es schon.",
  ENTRY_NOT_IN_REGISTRY:
    "{entityId} stammt aus YAML ohne unique_id und kann keiner Kategorie zugeordnet werden.",
  ENTRY_MOVED: "Verschoben.",
  ENTRY_UPDATED: "Gespeichert.",
  ENTRY_ACTION_DONE: "Erledigt.",
  ENTRY_ACTION_UNSUPPORTED: "„{action}“ geht für {entityId} nicht.",
  ENTRY_EXTRAS_SAVED: "Gespeichert.",

  CATEGORY_PATH_INVALID: "„{path}“ ist kein gültiger Kategoriename. Keine Ebene darf leer sein.",
  CATEGORY_NAME_TAKEN: "Die Kategorie „{path}“ gibt es schon.",
  CATEGORY_MOVE_INTO_ITSELF: "Eine Kategorie kann nicht in sich selbst verschoben werden.",
  CATEGORY_RENAMED: "Umbenannt.",
  CLEANUP_APPLIED: "Kategorien umgestellt.",
  CLEANUP_IGNORED: "Wird nicht mehr vorgeschlagen.",
  CLEANUP_RESTORED: "Ausgeblendete Vorschläge sind wieder da.",
  CLEANUP_DUPLICATE: "„{path}“ steht mehrfach in der Liste.",

  AREA_CREATED: "Bereich angelegt.",
  AREA_UPDATED: "Bereich gespeichert.",
  AREA_DELETED: "Bereich gelöscht.",
  AREA_NAME_TAKEN: "Den Bereich „{name}“ gibt es schon.",
  AREA_NOT_FOUND: "Diesen Bereich gibt es in Home Assistant nicht (mehr).",
  LABEL_CREATED: "Label angelegt.",
  LABEL_UPDATED: "Label gespeichert.",
  LABEL_DELETED: "Label gelöscht.",
  LABEL_NAME_TAKEN: "Das Label „{name}“ gibt es schon.",
  LABEL_NOT_FOUND: "Dieses Label gibt es in Home Assistant nicht (mehr).",

  FOLDER_CREATED: "Ordner angelegt.",
  FOLDER_DELETED: "Ordner entfernt.",
  FOLDER_EXISTS: "Den Ordner „{path}“ gibt es schon.",
  FOLDER_NOT_FOUND: "Den Ordner „{path}“ gibt es nicht.",
  FOLDER_COLOR_SAVED: "Farbe gespeichert.",
  FOLDER_ORDER_SAVED: "Reihenfolge gespeichert.",

  HELPER_CREATED: "Helfer angelegt.",
  HELPER_SETTINGS_INVALID: "Die Einstellung „{field}“ ist nicht gültig.",
  HELPER_NOT_EDITABLE:
    "{entityId} lässt sich hier noch nicht einstellen. Template- und Gruppen-Helfer kommen später; bis dahin in Home Assistant.",
  HELPER_SETTINGS_SAVED: "Einstellungen in Home Assistant gespeichert.",
  SCENE_SAVED: "Szene in Home Assistant gespeichert.",
  SCENE_NOT_EDITABLE:
    "{entityId} lässt sich hier nicht bearbeiten: Die Szene steht nicht in scenes.yaml (z. B. aus einem Package).",
  SCENE_PREVIEW_SHOWN: "Die Geräte zeigen jetzt die Szene.",
  SCENE_RESTORED: "Die Geräte sind wieder wie vorher.",
  HELPER_DELETED: "Helfer gelöscht.",
  FLOW_UNSUPPORTED: "{entityId} hat keinen Ablauf. Nur Automationen und Skripte haben einen.",
  FLOW_SAVED: "Ablauf in Home Assistant gespeichert.",
  FLOW_NOT_EDITABLE:
    "{entityId} lässt sich hier nicht bearbeiten oder löschen. Home Assistant verwaltet es nicht in automations.yaml bzw. scripts.yaml (z. B. aus einem Package oder einer Blueprint).",
  FLOW_INVALID: "Home Assistant hat den Ablauf abgelehnt: {reason}",
  FLOW_CREATED: "In Home Assistant angelegt.",
  TRACES_KEPT: "Home Assistant merkt sich jetzt die letzten {count} Durchläufe.",
  FLOW_DELETED: "In Home Assistant gelöscht.",

  MCP_SAVED: "Gespeichert.",
  MCP_TOKEN_RENEWED: "Neues Token erzeugt. Das alte gilt nicht mehr.",
  AI_PLAN_APPLIED: "Plan übernommen.",
  AI_PLAN_REJECTED: "Plan abgelehnt.",
  AI_PLAN_NOT_FOUND: "Diesen Plan gibt es nicht mehr.",
  AI_PLAN_CLOSED: "Über diesen Plan wurde schon entschieden.",
  AI_OPERATION_FAILED: "Dieser Schritt hat in Home Assistant nicht geklappt.",

  CHECKUP_IGNORED: "Wird nicht mehr gemeldet.",
  CHECKUP_RESTORED: "Ausgeblendete Funde sind wieder da.",
  PREFERENCES_NO_USER:
    "Einstellungen pro Benutzer gibt es nur, wenn HomeAce Studio über Home Assistant geöffnet wird.",
  PREFERENCE_INVALID: "Die Einstellung „{name}“ hat keinen gültigen Wert.",
  HELPER_NOT_DELETABLE:
    "{entityId} lässt sich hier nicht löschen. Template- und Gruppen-Helfer löschst du vorerst in Home Assistant.",
};
