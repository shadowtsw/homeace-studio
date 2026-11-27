import type {
  BlockChip,
  BlockSection,
  CatalogEntry,
  DisplayBlock,
  EditorCatalog,
} from "@/types/editor";
import { asRecord } from "@/utils/record";

import { CLASSIC_ICON, iconForKey, iconForSection } from "../blockIcons";
import { parsePath } from "../configPath";
import { ADDABLE_CLASSIC_FIELDS } from "../valueEditors";
import { baseBlock, KEY_SEPARATOR, type Context, type Raw } from "./context";
import {
  addableClassic,
  addableFields,
  fieldChips,
  missingChips,
  missingFields,
  valueChips,
} from "./fieldChips";
import { entityChip, missingTarget, targetChips } from "./targetChips";

/** Classic kinds that cannot do without an entity; a missing one shows as a chip asking for it. */
const ENTITY_KINDS: Record<BlockSection, Set<string>> = {
  trigger: new Set(["state", "numeric_state"]),
  condition: new Set(["state", "numeric_state", "zone"]),
  action: new Set(),
};

/** Further fields a classic block needs, per section and kind. */
const REQUIRED_FIELDS: Record<BlockSection, Record<string, string[]>> = {
  trigger: {
    time: ["at"],
    sun: ["event"],
    template: ["value_template"],
    event: ["event_type"],
    homeassistant: ["event"],
  },
  condition: {
    state: ["state"],
    template: ["value_template"],
    zone: ["zone"],
    trigger: ["id"],
  },
  action: {},
};

/** Classic kinds whose `entity_id` may list several entities. */
const MULTI_ENTITY_KINDS = new Set(["state", "numeric_state"]);

function catalogFor({
  section,
  catalog,
}: {
  section: BlockSection;
  catalog: EditorCatalog | null;
}): Record<string, CatalogEntry> {
  if (!catalog) return {};
  if (section === "trigger") return catalog.triggers;
  if (section === "condition") return catalog.conditions;

  return catalog.actions;
}

export type GenericBlockOptions = {
  section: BlockSection;
  key: string;
  raw: Raw;
  /**
   * Where the block keeps its fields: "options" (triggers, conditions) or "data" /
   * "data_template" (actions).
   */
  valuesKey: string;
  id: string;
  context: Context;
};

/**
 * A block of a type HA describes (catalog): title from HA, target entities, then set fields.
 */
export function genericBlock({
  section,
  key,
  raw,
  valuesKey,
  id,
  context,
}: GenericBlockOptions): DisplayBlock {
  // Known to HA? Actions with a dot ("light.turn_on") still show without a catalog entry.
  const entry = catalogFor({ section, catalog: context.catalog })[key];

  if (!entry && !key.includes(KEY_SEPARATOR)) return unknownBlock({ section, raw, id, context });

  // Title: each script is its own action ("script.gute_nacht") without a translation; its name
  // is known.
  const hasOwnName = entry !== undefined && entry.name !== key;
  const title = hasOwnName ? entry.name : (context.names[key] ?? entry?.name ?? key);
  const block = baseBlock({ section, icon: iconForKey({ key, section }), title, id, raw });
  // Chips: the target, then the set fields; missing ones ask for a value
  const path = parsePath(id);
  const values = asRecord(raw[valuesKey]);
  const valuesPath = [...path, valuesKey];

  block.chips = [
    ...targetChips({ raw, path, entry, context }),
    ...missingTarget({ raw, values, path, entry, context }),
    ...fieldChips({ values, valuesPath, entry, context }),
    ...missingFields({ values, valuesPath, entry }),
  ];
  block.addable = addableFields({ values, valuesPath, entry });

  return block;
}

export type ClassicBlockOptions = {
  section: BlockSection;
  kind: string;
  raw: Raw;
  fields: string[];
  id: string;
  context: Context;
};

/** Hand-made block: the kind's title, the entities of `entity_id`, then the listed fields. */
export function classicBlock({
  section,
  kind,
  raw,
  fields,
  id,
  context,
}: ClassicBlockOptions): DisplayBlock {
  // Title: some kinds read differently as a condition ("Zustand ist", not "Zustand ändert sich")
  const { titles } = context.texts;
  const title = titles[`${kind}_${section}`] ?? titles[kind] ?? kind;
  const block = baseBlock({
    section,
    icon: CLASSIC_ICON[kind] ?? iconForSection(section),
    title,
    id,
    raw,
  });
  // The entity chip, or one asking for it when the kind cannot do without
  const entityIdPath = [...parsePath(id), "entity_id"];
  const entity = entityChip({
    value: raw.entity_id,
    path: entityIdPath,
    domains: [],
    isMultiple: MULTI_ENTITY_KINDS.has(kind),
    isRemovable: false,
    context,
  });
  const entityChips = entityChipsOf({
    entity,
    hasEntity: Boolean(raw.entity_id),
    needsEntity: ENTITY_KINDS[section].has(kind),
    context,
  });

  // Fields: the set ones, the required empty ones, and what can be added
  const addable = section === "action" ? [] : (ADDABLE_CLASSIC_FIELDS[section][kind] ?? []);
  const required = REQUIRED_FIELDS[section][kind] ?? [];

  block.chips = [
    ...entityChips,
    ...valueChips({ raw, fields, kind, id, context }),
    ...missingChips({ raw, fields: required, kind, id, context }),
  ];
  block.addable = addableClassic({ raw, fields: addable, kind, id, context });

  return block;
}

/** The entity chip when the block has an entity; else one asking for it, if the kind needs one. */
function entityChipsOf({
  entity,
  hasEntity,
  needsEntity,
  context,
}: {
  entity: BlockChip;
  hasEntity: boolean;
  needsEntity: boolean;
  context: Context;
}): BlockChip[] {
  if (hasEntity) return [entity];
  if (!needsEntity) return [];

  return [{ ...entity, text: context.texts.entity, isMissing: true }];
}

export type UnknownBlockOptions = {
  section: BlockSection;
  raw: Raw;
  id: string;
  context: Context;
};

export function unknownBlock({ section, raw, id, context }: UnknownBlockOptions): DisplayBlock {
  const block = baseBlock({
    section,
    icon: "mdi-help-circle-outline",
    title: context.texts.titles.unknown ?? "?",
    id,
    raw,
  });
  block.isUnknown = true;

  return block;
}
