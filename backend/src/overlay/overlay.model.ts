import type { AiPlan, McpAccess } from "../ai/ai-plan.model";

export const OVERLAY_VERSION = 1;

/** One user's kept settings: short names, small plain values (see preferences/preference-values.ts). */
export type UserPreferences = Record<string, PreferenceValue>;

export type PreferenceValue = string | number | boolean;

/** Own extras that HA never sees. Grows with favorites, notes, colors, … */
export type Overlay = {
  version: typeof OVERLAY_VERSION;
  /**
   * HA categories HomeAce Studio created itself. Only these are deleted automatically when they
   * become empty; categories the user made in HA are never touched.
   */
  ownedCategoryIds: string[];
  /**
   * Folders the user created in the tree, e.g. "Haus/Pool". HA has no empty categories, so a folder
   * without entries lives only here; it stays until the user deletes it.
   */
  folders: string[];
  /** Entity IDs the user marked as favorites. */
  favorites: string[];
  /** Free notes per entity ID. */
  notes: Record<string, string>;
  /** Color per folder path, as "#rrggbb". */
  folderColors: Record<string, string>;
  /** Own order of subfolders per parent path ("" for the top level); HA stays alphabetical. */
  folderOrder: Record<string, string[]>;
  /** Clean-up proposals the user hid ("split:Büro - Licht", "merge:Routine|Routinen"). */
  cleanupIgnored: string[];
  /** Check-up findings the user hid ("gone:automation.x", "unused:input_boolean.y"). */
  checkupIgnored: string[];
  /** AI access over MCP: switched off until the user turns it on. */
  mcp: McpAccess;
  /** Folder plans from an AI, open ones and recently decided ones. */
  aiPlans: AiPlan[];
  /**
   * Settings that follow a HA user to every device, by HA user ID: preference name → value (e.g.
   * "locale" → "de"). A user without an entry has not opened HomeAce Studio through HA yet.
   */
  userPreferences: Record<string, UserPreferences>;
};

export const EMPTY_OVERLAY: Overlay = {
  version: OVERLAY_VERSION,
  ownedCategoryIds: [],
  folders: [],
  favorites: [],
  notes: {},
  folderColors: {},
  folderOrder: {},
  cleanupIgnored: [],
  checkupIgnored: [],
  mcp: { isEnabled: false, token: null },
  aiPlans: [],
  userPreferences: {},
};
