import type { Catalog } from "./catalog";

/** Russian texts. Placeholders like `{path}` are filled from `data.params`. */
export const CATALOG_RU: Catalog = {
  OK: "Готово.",
  CREATED: "Создано.",
  VALIDATION_FAILED: "Недопустимые данные.",
  NOT_FOUND: "Не найдено.",
  CONFLICT: "Это противоречит текущему состоянию.",
  REQUEST_FAILED: "Не удалось обработать запрос.",
  INTERNAL_ERROR: "Произошла непредвиденная ошибка.",

  INVALID_VALUE: "Недопустимое значение.",
  IS_NOT_EMPTY: "Не может быть пустым.",
  IS_STRING: "Должно быть текстом.",
  MIN_LENGTH: "Слишком короткий текст.",
  MAX_LENGTH: "Слишком длинный текст.",
  IS_IN: "Такое значение не допускается.",
  IS_OBJECT: "Неверная структура.",
  IS_BOOLEAN: "Должно быть «да» или «нет».",
  IS_ARRAY: "Должно быть списком.",
  MATCHES: "Не соответствует ожидаемому формату.",

  ENTRY_NOT_FOUND: "В Home Assistant нет записи {entityId}.",
  ENTRY_RENAMED: "ID объекта изменён.",
  ENTRY_DUPLICATED: "Копия создана.",
  ENTRY_ID_INVALID:
    "«{entityId}» не подходит как ID объекта: только строчные латинские буквы, цифры и _, домен тот же, что и раньше.",
  ENTRY_ID_TAKEN: "ID объекта «{entityId}» уже есть.",
  ENTRY_NOT_IN_REGISTRY:
    "{entityId} задан в YAML без unique_id, поэтому его нельзя поместить в категорию.",
  ENTRY_MOVED: "Перемещено.",
  ENTRY_UPDATED: "Сохранено.",
  ENTRY_ACTION_DONE: "Готово.",
  ENTRY_ACTION_UNSUPPORTED: "«{action}» не работает для {entityId}.",
  ENTRY_EXTRAS_SAVED: "Сохранено.",

  CATEGORY_PATH_INVALID:
    "«{path}» не подходит как название категории. Уровни не могут быть пустыми.",
  CATEGORY_NAME_TAKEN: "Категория «{path}» уже есть.",
  CATEGORY_MOVE_INTO_ITSELF: "Категорию нельзя переместить в саму себя.",
  CATEGORY_RENAMED: "Переименовано.",
  CLEANUP_APPLIED: "Категории преобразованы.",
  CLEANUP_IGNORED: "Больше не будет предлагаться.",
  CLEANUP_RESTORED: "Скрытые предложения снова показаны.",
  CLEANUP_DUPLICATE: "«{path}» встречается в списке больше одного раза.",

  AREA_CREATED: "Пространство создано.",
  AREA_UPDATED: "Пространство сохранено.",
  AREA_DELETED: "Пространство удалено.",
  AREA_NAME_TAKEN: "Пространство «{name}» уже есть.",
  AREA_NOT_FOUND: "В Home Assistant нет (больше) такого пространства.",

  FOLDER_CREATED: "Папка создана.",
  FOLDER_DELETED: "Папка удалена.",
  FOLDER_EXISTS: "Папка «{path}» уже есть.",
  FOLDER_NOT_FOUND: "Папки «{path}» нет.",
  FOLDER_ORDER_SAVED: "Порядок сохранён.",
  FOLDER_COLOR_SAVED: "Цвет сохранён.",

  HELPER_CREATED: "Вспомогательный элемент создан.",
  HELPER_SETTINGS_INVALID: "Недопустимое значение настройки «{field}».",
  HELPER_DELETED: "Вспомогательный элемент удалён.",
  FLOW_UNSUPPORTED: "У {entityId} нет логики. Она есть только у автоматизаций и скриптов.",
  FLOW_SAVED: "Логика сохранена в Home Assistant.",
  FLOW_NOT_EDITABLE:
    "{entityId} нельзя изменить или удалить здесь. Home Assistant хранит его не в automations.yaml или scripts.yaml (например, он из пакета или чертежа).",
  FLOW_INVALID: "Home Assistant не принял логику: {reason}",
  FLOW_CREATED: "Создано в Home Assistant.",
  TRACES_KEPT: "Теперь Home Assistant хранит до {count} последних запусков.",
  FLOW_DELETED: "Удалено в Home Assistant.",

  MCP_SAVED: "Сохранено.",
  MCP_TOKEN_RENEWED: "Создан новый токен. Старый больше не работает.",
  AI_PLAN_APPLIED: "План применён.",
  AI_PLAN_REJECTED: "План отклонён.",
  AI_PLAN_NOT_FOUND: "Этого плана больше нет.",
  AI_PLAN_CLOSED: "По этому плану уже есть решение.",
  AI_OPERATION_FAILED: "Этот шаг не удался в Home Assistant.",

  CHECKUP_IGNORED: "Больше не будет показываться.",
  CHECKUP_RESTORED: "Скрытые находки снова показаны.",
  HELPER_NOT_DELETABLE:
    "{entityId} здесь удалить нельзя. Вспомогательные элементы-шаблоны и группы пока удаляйте в Home Assistant.",
};
