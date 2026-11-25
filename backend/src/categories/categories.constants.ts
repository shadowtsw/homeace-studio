export const CATEGORY_REPOSITORY = Symbol("CATEGORY_REPOSITORY");

/** HA keeps one category list per scope; all helpers share the scope "helpers". */
export const CATEGORY_SCOPE = {
  automation: "automation",
  script: "script",
  scene: "scene",
  helpers: "helpers",
  /**
   * Folders for plain entities (lights, sensors, …). HA has no scope of its own for them; this one is
   * HomeAce Studio's. HA keeps it in its registry and backup but shows it nowhere, so HA's lists stay
   * short. Tested on HA: created, assigned, still there after a restart. Never rename it: it is
   * stored in the users' HA.
   */
  entities: "homeace_entities",
} as const;

export type CategoryScope = (typeof CATEGORY_SCOPE)[keyof typeof CATEGORY_SCOPE];

export const CATEGORY_SCOPES: readonly CategoryScope[] = Object.values(CATEGORY_SCOPE);

/** Separates the levels inside one HA category name ("Haus/Terrasse"). */
export const CATEGORY_SEPARATOR = "/";

/** HA limits names in its UI; we stay well below anything a path could reasonably need. */
export const CATEGORY_PATH_MAX_LENGTH = 255;

/** Folder colors are plain hex colors, e.g. "#e3a64e". */
export const FOLDER_COLOR_PATTERN = /^#[0-9a-fA-F]{6}$/;
