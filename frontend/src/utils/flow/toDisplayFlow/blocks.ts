import type {
  BlockChip,
  BlockSection,
  CatalogEntry,
  DisplayBlock,
  EditorCatalog,
} from "@/types/editor";

import { CLASSIC_ICON, iconForKey, iconForSection } from "../blockIcons";
import { parsePath } from "../configPath";
import { ADDABLE_CLASSIC_FIELDS } from "../valueEditors";
import { asRecord, baseBlock, KEY_SEPARATOR, type Context, type Raw } from "./context";
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

function catalogFor(
  section: BlockSection,
  catalog: EditorCatalog | null,
): Record<string, CatalogEntry> {
  if (!catalog) return {};
  if (section === "trigger") return catalog.triggers;
  if (section === "condition") return catalog.conditions;

  return catalog.actions;
}

/**
 * A block of a type HA describes (catalog): title from HA, target entities, then set fields.
 *
 * @param valuesKey - Where the block keeps its fields: "options" (triggers, conditions) or
 *   "data" / "data_template" (actions).
 */
export function genericBlock(
  section: BlockSection,
  key: string,
  raw: Raw,
  valuesKey: string,
  id: string,
  context: Context,
): DisplayBlock {
  const entry = catalogFor(section, context.catalog)[key];

  if (!entry && !key.includes(KEY_SEPARATOR)) return unknownBlock(section, raw, id, context);

  // Each script is its own action ("script.gute_nacht") without a translation; its name is known.
  const hasOwnName = entry !== undefined && entry.name !== key;
  const title = hasOwnName ? entry.name : (context.names[key] ?? entry?.name ?? key);
  const block = baseBlock(section, iconForKey(key, section), title, id, raw);
  const path = parsePath(id);
  const values = asRecord(raw[valuesKey]);
  const valuesPath = [...path, valuesKey];

  block.chips = [
    ...targetChips(raw, path, entry, context),
    ...missingTarget(raw, values, path, entry, context),
    ...fieldChips(values, valuesPath, entry, context),
    ...missingFields(values, valuesPath, entry),
  ];
  block.addable = addableFields(values, valuesPath, entry);

  return block;
}

/** Hand-made block: the kind's title, the entities of `entity_id`, then the listed fields. */
export function classicBlock(
  section: BlockSection,
  kind: string,
  raw: Raw,
  fields: string[],
  id: string,
  context: Context,
): DisplayBlock {
  const { titles } = context.texts;
  // Some kinds read differently as a condition ("Zustand ist" instead of "Zustand ändert sich").
  const title = titles[`${kind}_${section}`] ?? titles[kind] ?? kind;
  const block = baseBlock(section, CLASSIC_ICON[kind] ?? iconForSection(section), title, id, raw);
  const path = parsePath(id);
  const entity = entityChip(
    raw.entity_id,
    [...path, "entity_id"],
    [],
    MULTI_ENTITY_KINDS.has(kind),
    false,
    context,
  );
  const entityChips: BlockChip[] = raw.entity_id
    ? [entity]
    : ENTITY_KINDS[section].has(kind)
      ? [{ ...entity, text: context.texts.entity, isMissing: true }]
      : [];
  const addable = section === "action" ? [] : (ADDABLE_CLASSIC_FIELDS[section][kind] ?? []);
  const required = REQUIRED_FIELDS[section][kind] ?? [];

  block.chips = [
    ...entityChips,
    ...valueChips(raw, fields, kind, id, context),
    ...missingChips(raw, required, kind, id, context),
  ];
  block.addable = addableClassic(raw, addable, kind, id, context);

  return block;
}

export function unknownBlock(
  section: BlockSection,
  raw: Raw,
  id: string,
  context: Context,
): DisplayBlock {
  const block = baseBlock(
    section,
    "mdi-help-circle-outline",
    context.texts.titles.unknown ?? "?",
    id,
    raw,
  );
  block.isUnknown = true;

  return block;
}
