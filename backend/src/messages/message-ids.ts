/**
 * All message IDs the API can send in `ApiResponse.message` or in validation `fields`.
 * Every ID needs a text in each catalog (enforced by the `Catalog` type).
 */
export const MESSAGE_ID = {
  // Common IDs (see docs/api.md)
  ok: "OK",
  created: "CREATED",
  validationFailed: "VALIDATION_FAILED",
  notFound: "NOT_FOUND",
  conflict: "CONFLICT",
  requestFailed: "REQUEST_FAILED",
  internalError: "INTERNAL_ERROR",

  // Validation constraints, used in `data.fields[].message`
  invalidValue: "INVALID_VALUE",
  isNotEmpty: "IS_NOT_EMPTY",
  isString: "IS_STRING",
  minLength: "MIN_LENGTH",
  maxLength: "MAX_LENGTH",
  isIn: "IS_IN",
  isObject: "IS_OBJECT",
  isBoolean: "IS_BOOLEAN",
  isArray: "IS_ARRAY",
  matches: "MATCHES",

  // Entries
  entryNotFound: "ENTRY_NOT_FOUND",
  entryNotInRegistry: "ENTRY_NOT_IN_REGISTRY",
  entryMoved: "ENTRY_MOVED",
  entryUpdated: "ENTRY_UPDATED",
  entryActionDone: "ENTRY_ACTION_DONE",
  entryActionUnsupported: "ENTRY_ACTION_UNSUPPORTED",
  entryExtrasSaved: "ENTRY_EXTRAS_SAVED",
  entryRenamed: "ENTRY_RENAMED",
  entryDuplicated: "ENTRY_DUPLICATED",
  entryIdInvalid: "ENTRY_ID_INVALID",
  entryIdTaken: "ENTRY_ID_TAKEN",

  // Categories
  categoryPathInvalid: "CATEGORY_PATH_INVALID",
  categoryNameTaken: "CATEGORY_NAME_TAKEN",
  categoryMoveIntoItself: "CATEGORY_MOVE_INTO_ITSELF",
  categoryRenamed: "CATEGORY_RENAMED",
  cleanupApplied: "CLEANUP_APPLIED",
  cleanupIgnored: "CLEANUP_IGNORED",
  cleanupRestored: "CLEANUP_RESTORED",
  cleanupDuplicate: "CLEANUP_DUPLICATE",

  // Areas (HA area registry)
  areaCreated: "AREA_CREATED",
  areaUpdated: "AREA_UPDATED",
  areaDeleted: "AREA_DELETED",
  areaNameTaken: "AREA_NAME_TAKEN",
  areaNotFound: "AREA_NOT_FOUND",

  // Labels
  labelCreated: "LABEL_CREATED",
  labelUpdated: "LABEL_UPDATED",
  labelDeleted: "LABEL_DELETED",
  labelNameTaken: "LABEL_NAME_TAKEN",
  labelNotFound: "LABEL_NOT_FOUND",

  // Folders (empty folders of the tree)
  folderCreated: "FOLDER_CREATED",
  folderDeleted: "FOLDER_DELETED",
  folderExists: "FOLDER_EXISTS",
  folderNotFound: "FOLDER_NOT_FOUND",
  folderColorSaved: "FOLDER_COLOR_SAVED",
  folderOrderSaved: "FOLDER_ORDER_SAVED",

  // Helpers
  helperCreated: "HELPER_CREATED",
  helperSettingsInvalid: "HELPER_SETTINGS_INVALID",
  helperDeleted: "HELPER_DELETED",
  helperNotDeletable: "HELPER_NOT_DELETABLE",
  helperNotEditable: "HELPER_NOT_EDITABLE",
  helperSettingsSaved: "HELPER_SETTINGS_SAVED",
  sceneSaved: "SCENE_SAVED",
  sceneNotEditable: "SCENE_NOT_EDITABLE",
  scenePreviewShown: "SCENE_PREVIEW_SHOWN",
  sceneRestored: "SCENE_RESTORED",

  // Editor
  flowUnsupported: "FLOW_UNSUPPORTED",
  flowSaved: "FLOW_SAVED",
  flowNotEditable: "FLOW_NOT_EDITABLE",
  flowInvalid: "FLOW_INVALID",
  flowCreated: "FLOW_CREATED",
  flowDeleted: "FLOW_DELETED",
  tracesKept: "TRACES_KEPT",

  // Versions (Git light)
  versionsUnsupported: "VERSIONS_UNSUPPORTED",
  versionNotFound: "VERSION_NOT_FOUND",
  versionNamesFull: "VERSION_NAMES_FULL",
  versionSaved: "VERSION_SAVED",
  versionRestored: "VERSION_RESTORED",
  versionClosed: "VERSION_CLOSED",
  trashRestored: "TRASH_RESTORED",
  trashNotFound: "TRASH_NOT_FOUND",

  // AI access (MCP) and folder plans
  mcpSaved: "MCP_SAVED",
  mcpTokenRenewed: "MCP_TOKEN_RENEWED",
  aiPlanApplied: "AI_PLAN_APPLIED",
  aiPlanRejected: "AI_PLAN_REJECTED",
  aiPlanNotFound: "AI_PLAN_NOT_FOUND",
  aiPlanClosed: "AI_PLAN_CLOSED",
  aiOperationFailed: "AI_OPERATION_FAILED",

  // Check-up
  checkupIgnored: "CHECKUP_IGNORED",
  checkupRestored: "CHECKUP_RESTORED",

  // Entitäten einsortieren
  entitySortingSaved: "ENTITY_SORTING_SAVED",
  entitySortingMoved: "ENTITY_SORTING_MOVED",
  entitySortingUndone: "ENTITY_SORTING_UNDONE",
  entitySortingRunNotFound: "ENTITY_SORTING_RUN_NOT_FOUND",

  // Settings per HA user
  preferencesNoUser: "PREFERENCES_NO_USER",
  preferenceInvalid: "PREFERENCE_INVALID",
} as const;

export type MessageId = (typeof MESSAGE_ID)[keyof typeof MESSAGE_ID];
