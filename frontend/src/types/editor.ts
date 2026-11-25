/** Mirrors `backend/src/editor/editor.model.ts`. */

export type CatalogField = {
  name: string | null;
  description: string | null;
  required: boolean;
  default?: unknown;
  selector: Record<string, unknown> | null;
};

export type CatalogEntry = {
  name: string;
  description: string | null;
  fields: Record<string, CatalogField>;
  target: unknown;
};

export type EditorCatalog = {
  triggers: Record<string, CatalogEntry>;
  conditions: Record<string, CatalogEntry>;
  actions: Record<string, CatalogEntry>;
};

export type FlowKind = "automation" | "script";

export type Flow = {
  entityId: string;
  kind: FlowKind;
  config: Record<string, unknown>;
  entityNames: Record<string, string>;
  /** Lives in automations.yaml / scripts.yaml and can be saved; otherwise read-only. */
  isEditable: boolean;
};

/** An entity from `GET /api/entities`, for the entity picker. */
export type EntityOption = {
  entityId: string;
  /** Full friendly name. */
  name: string;
  /** Name within its device ("Batterie"); the full name without a device. */
  shortName: string;
  domain: string;
  state: string;
  unit: string | null;
  options: string[] | null;
  deviceId: string | null;
  deviceName: string | null;
  /** Own area, else the device's. */
  areaId: string | null;
  areaName: string | null;
  labels: string[];
  /** Its folder (HomeAce Studio's own category scope in HA); null when none. */
  categoryPath: string | null;
  /** Without a registry entry (YAML without unique_id) it cannot have a folder. */
  isInRegistry: boolean;
};

export type BlockSection = "trigger" | "condition" | "action";

/** Where a value sits in the config, e.g. ["actions", 2, "data", "brightness_pct"]. */
export type ConfigPath = (string | number)[];

export type ChoiceOption = {
  value: string;
  label: string;
  /** Second line, e.g. the technical key. */
  sub?: string;
  /** mdi class shown before the label, for menus. */
  icon?: string;
  /** Shown in red, e.g. "Löschen". */
  isDanger?: boolean;
};

/** How a value is edited; derived from HA's selector or, for classic blocks, from the field. */
export type ValueEditor =
  | {
      type: "entity";
      domains: string[];
      isMultiple: boolean;
      /** Action targets only: where an area goes instead ("all lights in the living room"). */
      areaPath?: ConfigPath;
    }
  | { type: "area"; isMultiple: boolean }
  | { type: "number"; min?: number; max?: number; step?: number; unit?: string }
  | { type: "boolean" }
  | { type: "choice"; options: ChoiceOption[]; isMultiple: boolean }
  | { type: "duration" }
  | { type: "time" }
  | { type: "date" }
  /** Free text, with the states of these entities as suggestions (for "to", "state", …). */
  | { type: "text"; isMultiline: boolean; stateOf?: string[] }
  | { type: "template" };

/** What clicking a chip edits: one value at one place in the config. */
export type ChipEdit = {
  path: ConfigPath;
  /** Shown above the editor, e.g. "Helligkeit". */
  title: string;
  editor: ValueEditor;
  /** The value now; undefined for a field that is not set yet. */
  value: unknown;
  /** Optional fields can be removed again; required ones only changed. */
  isRemovable: boolean;
};

/** One piece of a block sentence: an entity, a named value, or plain text. */
export type BlockChip = {
  kind: "entity" | "value" | "text";
  /** Field name for values, e.g. "Für mindestens"; absent for entities and text. */
  label?: string;
  text: string;
  /** Set when the value can be edited; read-only chips have none. */
  edit?: ChipEdit;
  /** A required value is not set yet; the chip shows the field name and asks for it. */
  isMissing?: boolean;
  /** Names an entity HA no longer has (check-up); shown in red. */
  isGone?: boolean;
};

/** A block as the flow view shows it; built from HA config by `toDisplayFlow`. */
export type DisplayBlock = {
  /** Stable within one flow: its path in the config, e.g. "actions.2.then.0". */
  id: string;
  section: BlockSection;
  icon: string;
  title: string;
  chips: BlockChip[];
  /** Nested blocks with a label, e.g. "dann" / "sonst" of an if. */
  branches: DisplayBranch[];
  /** Where the block sits: its list in the config, its index and the list length. */
  position: BlockPosition;
  isDisabled: boolean;
  /** Optional fields that are not set yet, offered behind a "+" chip. */
  addable: ChipEdit[];
  /** HomeAce Studio does not know this kind of block; it is kept as it is. */
  isUnknown: boolean;
  /** The block's own config, e.g. for the technical view. */
  raw: unknown;
};

export type BlockPosition = { listPath: ConfigPath; index: number; count: number };

/** A list new blocks can be added to, e.g. the "then" actions of an if. */
export type AddTarget = { section: BlockSection; listPath: ConfigPath };

export type DisplayBranch = {
  label: string;
  blocks: DisplayBlock[];
  /** Lists of this branch that take new blocks (a choose option has conditions and actions). */
  add: AddTarget[];
};

/** One change to a flow; the editor store applies it to the draft with `applyFlowChange`. */
export type FlowChange =
  | { type: "set"; path: ConfigPath; value: unknown }
  | { type: "insert"; listPath: ConfigPath; item: unknown }
  | { type: "move"; listPath: ConfigPath; from: number; to: number }
  | { type: "duplicate"; listPath: ConfigPath; index: number }
  | { type: "remove"; listPath: ConfigPath; index: number }
  | { type: "toggle"; listPath: ConfigPath; index: number };

/** A block type offered when adding: a catalog key ("zone.entered") or a hand-made kind ("delay"). */
export type BlockType = { key: string; label: string; icon: string; isClassic: boolean };

/** How a running flow reacts when it is started again (HA's `mode`). */
export const FLOW_MODES = ["single", "restart", "queued", "parallel"] as const;
export type FlowMode = (typeof FLOW_MODES)[number];

export type DisplayFlow = {
  /** HA's default is "single" when the config has no mode. */
  mode: string;
  triggers: DisplayBlock[];
  conditions: DisplayBlock[];
  actions: DisplayBlock[];
  /** Where new top-level blocks go (the keys the config really uses). */
  add: { triggers: AddTarget; conditions: AddTarget; actions: AddTarget };
};
