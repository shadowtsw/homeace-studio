export const SCENE_REPOSITORY = Symbol("SCENE_REPOSITORY");
/** The time in ms that becomes the id of a new scene (like HA's editor); replaceable in tests. */
export const SCENE_CLOCK = Symbol("SCENE_CLOCK");

/** HA's limit is far higher; a scene with more devices than this is no scene anymore. */
export const SCENE_MAX_DEVICES = 200;
