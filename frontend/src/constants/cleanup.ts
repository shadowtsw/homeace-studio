import type { CategoryScope } from "@/services/cleanupService";

/** The order in which the tidy-up assistant lists HA's scopes. */
export const CLEANUP_SCOPE_ORDER: readonly CategoryScope[] = [
  "automation",
  "script",
  "scene",
  "helpers",
  "homeace_entities",
];

/** Backend scope → key below `scope.` in the locale files. */
export const CLEANUP_SCOPE_KEY: Record<CategoryScope, string> = {
  automation: "automation",
  script: "script",
  scene: "scene",
  helpers: "helper",
  homeace_entities: "entities",
};
