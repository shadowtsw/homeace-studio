/** HA has no stated limit; this keeps names readable as chips. */
export const LABEL_NAME_MAX_LENGTH = 100;

/** An mdi icon like "mdi:lightbulb". */
export const LABEL_ICON_PATTERN = /^mdi:[a-z0-9-]+$/;

/** HA keeps either one of its colour names ("indigo", "light-blue") or a hex value. */
export const LABEL_COLOR_PATTERN = /^([a-z]+(-[a-z]+)*|#[0-9a-fA-F]{6})$/;
