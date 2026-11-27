import type { Catalog } from "./catalog";

/** Spanish texts (machine-assisted, improvements welcome). Placeholders like `{path}` come from `data.params`. */
export const CATALOG_ES: Catalog = {
  OK: "Hecho.",
  CREATED: "Creado.",
  VALIDATION_FAILED: "La entrada no es válida.",
  NOT_FOUND: "No encontrado.",
  CONFLICT: "Esto entra en conflicto con el estado actual.",
  REQUEST_FAILED: "No se pudo procesar la solicitud.",
  INTERNAL_ERROR: "Se produjo un error inesperado.",

  INVALID_VALUE: "Valor no válido.",
  IS_NOT_EMPTY: "No puede estar vacío.",
  IS_STRING: "Debe ser texto.",
  MIN_LENGTH: "El texto es demasiado corto.",
  MAX_LENGTH: "El texto es demasiado largo.",
  IS_IN: "Este valor no está permitido.",
  IS_OBJECT: "Estructura no válida.",
  IS_BOOLEAN: "Debe ser sí o no.",
  IS_ARRAY: "Debe ser una lista.",
  MATCHES: "No tiene el formato esperado.",

  ENTRY_NOT_FOUND: "Home Assistant no tiene ninguna entrada {entityId}.",
  ENTRY_RENAMED: "ID de entidad cambiado.",
  ENTRY_DUPLICATED: "Copia creada.",
  ENTRY_ID_INVALID:
    "“{entityId}” no sirve como ID de entidad: solo minúsculas, cifras y _, el mismo dominio que antes.",
  ENTRY_ID_TAKEN: "El ID de entidad “{entityId}” ya existe.",
  ENTRY_NOT_IN_REGISTRY:
    "{entityId} viene de YAML sin unique_id y no se puede poner en una categoría.",
  ENTRY_MOVED: "Movido.",
  ENTRY_UPDATED: "Guardado.",
  ENTRY_ACTION_DONE: "Hecho.",
  ENTRY_ACTION_UNSUPPORTED: "“{action}” no funciona para {entityId}.",
  ENTRY_EXTRAS_SAVED: "Guardado.",

  CATEGORY_PATH_INVALID:
    "“{path}” no es un nombre de categoría válido. Ningún nivel puede estar vacío.",
  CATEGORY_NAME_TAKEN: "La categoría “{path}” ya existe.",
  CATEGORY_MOVE_INTO_ITSELF: "Una categoría no se puede mover dentro de sí misma.",
  CATEGORY_RENAMED: "Renombrado.",
  CLEANUP_APPLIED: "Categorías convertidas.",
  CLEANUP_IGNORED: "No se volverá a sugerir.",
  CLEANUP_RESTORED: "Las sugerencias ocultas han vuelto.",
  CLEANUP_DUPLICATE: "“{path}” aparece más de una vez en la lista.",

  AREA_CREATED: "Área creada.",
  AREA_UPDATED: "Área guardada.",
  AREA_DELETED: "Área eliminada.",
  AREA_NAME_TAKEN: "Ya existe un área “{name}”.",
  AREA_NOT_FOUND: "Home Assistant no tiene (o ya no tiene) esta área.",
  LABEL_CREATED: "Etiqueta creada.",
  LABEL_UPDATED: "Etiqueta guardada.",
  LABEL_DELETED: "Etiqueta eliminada.",
  LABEL_NAME_TAKEN: "La etiqueta “{name}” ya existe.",
  LABEL_NOT_FOUND: "Home Assistant no tiene (o ya no tiene) esta etiqueta.",

  FOLDER_CREATED: "Carpeta creada.",
  FOLDER_DELETED: "Carpeta eliminada.",
  FOLDER_EXISTS: "La carpeta “{path}” ya existe.",
  FOLDER_NOT_FOUND: "No hay ninguna carpeta “{path}”.",
  FOLDER_ORDER_SAVED: "Orden guardado.",
  FOLDER_COLOR_SAVED: "Color guardado.",

  HELPER_CREATED: "Ayudante creado.",
  HELPER_SETTINGS_INVALID: "El ajuste “{field}” no es válido.",
  HELPER_NOT_EDITABLE:
    "{entityId} todavía no se puede configurar aquí. Los ayudantes de plantilla y de grupo llegarán más adelante; hasta entonces, en Home Assistant.",
  HELPER_SETTINGS_SAVED: "Ajustes guardados en Home Assistant.",
  SCENE_SAVED: "Escena guardada en Home Assistant.",
  SCENE_NOT_EDITABLE:
    "{entityId} no se puede editar aquí: la escena no está en scenes.yaml (p. ej. viene de un paquete).",
  SCENE_PREVIEW_SHOWN: "Los dispositivos muestran ahora la escena.",
  SCENE_RESTORED: "Los dispositivos vuelven a estar como antes.",
  HELPER_DELETED: "Ayudante eliminado.",
  FLOW_UNSUPPORTED:
    "{entityId} no tiene flujo. Solo las automatizaciones y los scripts tienen uno.",
  FLOW_SAVED: "Flujo guardado en Home Assistant.",
  FLOW_NOT_EDITABLE:
    "{entityId} no se puede editar ni eliminar aquí. Home Assistant no lo guarda en automations.yaml ni en scripts.yaml (p. ej. viene de un paquete o de un blueprint).",
  FLOW_INVALID: "Home Assistant rechazó el flujo: {reason}",
  FLOW_CREATED: "Creado en Home Assistant.",
  TRACES_KEPT: "Home Assistant guarda ahora las últimas {count} ejecuciones.",
  VERSIONS_UNSUPPORTED:
    "{entityId} no tiene versiones: solo se guardan las automatizaciones, scripts y escenas que HomeAce Studio puede editar.",
  VERSION_NOT_FOUND: "Esta versión ya no existe.",
  VERSION_NAMES_FULL: "Ya hay {max} versiones con nombre. Quita primero el nombre de otra.",
  VERSION_SAVED: "Guardado.",
  VERSION_RESTORED: "Recuperado. El estado anterior se queda en las versiones.",
  VERSION_CLOSED: "Cerrado. El siguiente cambio empieza una versión nueva.",
  VERSION_WOULD_DROP:
    "Esta versión es más antigua que las últimas {max} y se borraría. Eso solo ocurre si lo confirmas.",
  TRASH_RESTORED: "{name} ha vuelto, creado de nuevo en Home Assistant.",
  TRASH_NOT_FOUND: "Esto ya no está en la papelera.",
  FLOW_DELETED: "Eliminado en Home Assistant.",

  MCP_SAVED: "Guardado.",
  MCP_TOKEN_RENEWED: "Nuevo token creado. El anterior ya no funciona.",
  AI_PLAN_APPLIED: "Plan aplicado.",
  AI_PLAN_REJECTED: "Plan rechazado.",
  AI_PLAN_NOT_FOUND: "Este plan ya no existe.",
  AI_PLAN_CLOSED: "Este plan ya se decidió.",
  AI_OPERATION_FAILED: "Este paso no funcionó en Home Assistant.",

  CHECKUP_IGNORED: "No se volverá a informar.",
  CHECKUP_RESTORED: "Los hallazgos ocultos han vuelto.",
  ENTITY_SORTING_SAVED: "Guardado.",
  ENTITY_SORTING_MOVED: "Clasificado.",
  ENTITY_SORTING_UNDONE: "Deshecho.",
  ENTITY_SORTING_RUN_NOT_FOUND: "Esta pasada ya no se puede deshacer.",
  PREFERENCES_NO_USER:
    "Los ajustes por usuario solo existen si HomeAce Studio se abre desde Home Assistant.",
  PREFERENCE_INVALID: "El ajuste “{name}” no tiene un valor válido.",
  THEMES_NO_USER:
    "Los temas propios pertenecen a un usuario de Home Assistant; sin iniciar sesión se quedan en el navegador.",
  THEME_INVALID: "No es un tema válido.",
  THEME_LIMIT_REACHED: "Como máximo {count} temas propios. Borra uno para añadir otro nuevo.",
  THEME_NOT_FOUND: "Este tema ya no existe.",
  HELPER_NOT_DELETABLE:
    "{entityId} no se puede eliminar aquí. Por ahora, elimina los ayudantes de plantilla y de grupo en Home Assistant.",
};
