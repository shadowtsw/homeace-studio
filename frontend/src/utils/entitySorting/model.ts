import type { SortingDevice, SortingEntity, SortingRole, SortingRule } from "@/types/entitySorting";

/** All entities of one device, or one entity without a device: one decision in the tool. */
export type SortingBundle = {
  /** Device id, or "entity:<entityId>". */
  key: string;
  name: string;
  device: SortingDevice | null;
  entities: SortingEntity[];
  /** What the bundle is about (light, switch …), not its battery. */
  main: SortingEntity;
  areaId: string | null;
  integration: string | null;
  /** Service devices and system entities without a device (sun, zones, updates …). */
  isSystem: boolean;
  words: Map<string, string>;
};

export type Confidence = "rule" | "sure" | "likely" | "unclear";

/** Why a folder is proposed; the UI turns it into text. */
export type SortingReason =
  | { kind: "rule"; ruleNumber: number; isConflict: boolean }
  | { kind: "area"; areaName: string; pattern: string | null }
  | { kind: "flow"; role: SortingRole; flowName: string }
  | { kind: "similar"; count: number; word: string }
  | { kind: "system" }
  | { kind: "everywhere" }
  | { kind: "more"; count: number };

/** The kind of hint, for the short summary of a group ("Abläufe, Bereich"). */
export type HintKind = "rule" | "flow" | "area" | "similar" | "system";

export type Suggestion = {
  target: string | null;
  confidence: Confidence;
  reasons: SortingReason[];
  hintKinds: HintKind[];
  /** Runners-up, for the chips "Lieber: …". */
  alternatives: string[];
  /** The target does not exist yet. */
  isNew: boolean;
  /** Some entity is used everywhere without a majority, so its uses did not vote. */
  isUsedEverywhere: boolean;
  ruleNumber: number | null;
};

/** What the user did with one bundle in this session. */
export type BundleChoice = {
  isOn: boolean;
  /** True once the user ticked, unticked or corrected it; pre-ticks never overrule that. */
  isTouched: boolean;
  /** A folder the user picked themselves (a correction). */
  target?: string;
};

/** Settings of one run (step 1 and 2). */
export type SortingOptions = {
  includeHidden: boolean;
  /** Technical entities go to `technicalFolder` instead of staying with their device. */
  isTechnicalSeparate: boolean;
  technicalFolder: string;
  /** Rules also move entities that have a folder already. */
  isResortingSorted: boolean;
};

/** What the engine reads besides the home: memory, options and the user's choices. */
export type SortingState = {
  rules: SortingRule[];
  /** Bundle key → folders turned down. */
  rejected: Map<string, Set<string>>;
  ignored: Set<string>;
  options: SortingOptions;
  choices: Map<string, BundleChoice>;
  /** Entities unticked inside a bundle. */
  excluded: Set<string>;
  /** Names the user gave new folders, by group key. */
  groupNames: Map<string, string>;
};

/** Texts the engine needs in the UI language: names of new system and device-class folders. */
export type SortingNames = {
  /** "System". */
  system: string;
  /** Name per system domain or integration ("sun" → "Sonne"); missing ones use the integration name. */
  systemKinds: Record<string, string>;
  /** Folder name per device class ("smoke" → "Rauchmelder"). */
  deviceClasses: Record<string, string>;
};

export type GroupType = "folder" | "new" | "system" | "rest";

/** Why a new folder is proposed. */
export type GroupOrigin =
  | { kind: "rule"; ruleNumber: number }
  | { kind: "area" }
  | { kind: "name" }
  | { kind: "integration" }
  | { kind: "deviceClass" };

/** A row group in step 3; fixed until the list is ordered again, so rows never jump. */
export type SortingGroup = {
  key: string;
  type: GroupType;
  /** The folder the group was built for; null for system and rest. */
  target: string | null;
  origin: GroupOrigin | null;
  bundles: SortingBundle[];
};

export type SortingLayout = {
  folder: SortingGroup[];
  fresh: SortingGroup[];
  system: SortingGroup | null;
  rest: SortingGroup | null;
  groupOf: Map<string, SortingGroup>;
};

export type SortingComputation = {
  bundles: Map<string, SortingBundle>;
  suggestions: Map<string, Suggestion>;
  folders: Set<string>;
  areaPattern: string;
};

export type SuggestionChange = "surer" | "lessSure" | "newTarget";

/** One entity move the apply sends. */
export type PlannedMove = { entityId: string; categoryPath: string };
