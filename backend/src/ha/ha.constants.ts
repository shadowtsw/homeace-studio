/** Injection token for the resolved {@link HaEndpoint}. */
export const HA_ENDPOINT = Symbol("HA_ENDPOINT");

/** Injection token for the in-memory home of demo mode; null when a real HA is used. */
export const FAKE_HA = Symbol("FAKE_HA");

export const HA_ENV = {
  url: "HA_URL",
  token: "HA_TOKEN",
  /** Set by the Supervisor inside an add-on with `homeassistant_api: true`. */
  supervisorToken: "SUPERVISOR_TOKEN",
} as const;

/** Inside an add-on the Supervisor proxies Home Assistant Core under these addresses. */
export const SUPERVISOR_REST_URL = "http://supervisor/core/api";
export const SUPERVISOR_WEBSOCKET_URL = "ws://supervisor/core/websocket";

/** Paths below HA_URL when connecting directly (local development). */
export const LOCAL_REST_PATH = "/api";
export const LOCAL_WEBSOCKET_PATH = "/api/websocket";

export const HA_MESSAGE = {
  auth: "auth",
  authRequired: "auth_required",
  authOk: "auth_ok",
  authInvalid: "auth_invalid",
  result: "result",
  event: "event",
} as const;

export const HA_COMMAND = {
  getStates: "get_states",
  entityRegistryList: "config/entity_registry/list",
  entityRegistryUpdate: "config/entity_registry/update",
  categoryRegistryList: "config/category_registry/list",
  categoryRegistryCreate: "config/category_registry/create",
  categoryRegistryUpdate: "config/category_registry/update",
  categoryRegistryDelete: "config/category_registry/delete",
  labelRegistryList: "config/label_registry/list",
  labelRegistryCreate: "config/label_registry/create",
  labelRegistryUpdate: "config/label_registry/update",
  labelRegistryDelete: "config/label_registry/delete",
  areaRegistryList: "config/area_registry/list",
  areaRegistryCreate: "config/area_registry/create",
  areaRegistryUpdate: "config/area_registry/update",
  areaRegistryDelete: "config/area_registry/delete",
  traceList: "trace/list",
  traceGet: "trace/get",
  deviceRegistryList: "config/device_registry/list",
  floorRegistryList: "config/floor_registry/list",
  /** Dashboard resources; icon packs like custom-brand-icons are among them. */
  lovelaceResources: "lovelace/resources",
  configEntriesGet: "config_entries/get",
  callService: "call_service",
  subscribeEvents: "subscribe_events",
  unsubscribeEvents: "unsubscribe_events",
  triggerPlatformsSubscribe: "trigger_platforms/subscribe",
  conditionPlatformsSubscribe: "condition_platforms/subscribe",
  getServices: "get_services",
  getTranslations: "frontend/get_translations",
  automationConfig: "automation/config",
  scriptConfig: "script/config",
  entityRegistryGet: "config/entity_registry/get",
  /** Helper storage collections: `input_boolean/create`, `counter/create`, … */
  helperCreateSuffix: "/create",
  /** `input_boolean/delete` with `{ input_boolean_id: … }`, … */
  helperDeleteSuffix: "/delete",
  /** `input_number/list`: every stored helper of a type with its settings. */
  helperListSuffix: "/list",
  /** `input_number/update` with `{ input_number_id: … }`; HA replaces the stored helper with it. */
  helperUpdateSuffix: "/update",
} as const;

/** REST paths (below `/api`) of the files behind HA's automation and script editors. */
export const HA_REST_PATH = {
  automationConfig: "config/automation/config/",
  scriptConfig: "config/script/config/",
  /** scenes.yaml, by the scene's id; HA's own scene editor uses it too. */
  sceneConfig: "config/scene/config/",
} as const;

export const HA_CONFIG_ENTRY_TYPE = {
  helper: "helper",
} as const;

export const HA_REQUEST_TIMEOUT_MS = 15_000;

/** Wait before reconnecting after the connection dropped, so a restarting HA is not hammered. */
export const HA_RECONNECT_DELAY_MS = 5_000;

/** Fallback when HA reports an error without a code. */
export const HA_UNKNOWN_ERROR_CODE = "unknown_error";

/** Error codes HA answers WebSocket commands with (`success: false`). */
export const HA_ERROR_CODE = {
  notFound: "not_found",
} as const;
