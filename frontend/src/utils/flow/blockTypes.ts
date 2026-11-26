import type { BlockSection, BlockType, CatalogEntry, EditorCatalog } from "@/types/editor";

import { CLASSIC_ICON, iconForKey, iconForSection } from "./blockIcons";

type Raw = Record<string, unknown>;

/** Hand-made block kinds offered when adding, per section, in this order (before HA's catalog). */
export const CLASSIC_KINDS: Record<BlockSection, string[]> = {
  trigger: [
    "state",
    "numeric_state",
    "time",
    "time_pattern",
    "sun",
    "template",
    "event",
    "homeassistant",
  ],
  condition: [
    "state",
    "numeric_state",
    "time",
    "sun",
    "template",
    "zone",
    "trigger",
    "and",
    "or",
    "not",
  ],
  action: ["delay", "if", "choose", "repeat", "wait", "parallel", "stop"],
};

/** A one-minute delay: a new "Warten" is useful right away and easy to change. */
const DEFAULT_DELAY = { hours: 0, minutes: 1, seconds: 0 };
const DEFAULT_REPEAT_COUNT = 2;

/**
 * New hand-made blocks. Values that have an obvious default get it (sun → sunset); values the
 * user must choose (entity, time, template) stay empty and show as missing chips.
 */
const CLASSIC_TEMPLATES: Record<BlockSection, Record<string, () => Raw>> = {
  trigger: {
    state: () => ({ trigger: "state" }),
    numeric_state: () => ({ trigger: "numeric_state" }),
    time: () => ({ trigger: "time" }),
    time_pattern: () => ({ trigger: "time_pattern", minutes: "/5" }),
    sun: () => ({ trigger: "sun", event: "sunset" }),
    template: () => ({ trigger: "template" }),
    event: () => ({ trigger: "event" }),
    homeassistant: () => ({ trigger: "homeassistant", event: "start" }),
  },
  condition: {
    state: () => ({ condition: "state" }),
    numeric_state: () => ({ condition: "numeric_state" }),
    time: () => ({ condition: "time" }),
    sun: () => ({ condition: "sun", after: "sunset" }),
    template: () => ({ condition: "template" }),
    zone: () => ({ condition: "zone" }),
    trigger: () => ({ condition: "trigger" }),
    and: () => ({ condition: "and", conditions: [] }),
    or: () => ({ condition: "or", conditions: [] }),
    not: () => ({ condition: "not", conditions: [] }),
  },
  action: {
    delay: () => ({ delay: { ...DEFAULT_DELAY } }),
    // HA itself names the branch of an if block "then"; this is real HA config.
    // oxlint-disable-next-line unicorn/no-thenable
    if: () => ({ if: [], then: [] }),
    choose: () => ({ choose: [{ conditions: [], sequence: [] }] }),
    repeat: () => ({ repeat: { count: DEFAULT_REPEAT_COUNT, sequence: [] } }),
    wait: () => ({ wait_for_trigger: [] }),
    parallel: () => ({ parallel: [] }),
    stop: () => ({ stop: "" }),
  },
};

/** The key a catalog block is stored under: `trigger: "zone.entered"`, `action: "light.turn_on"`. */
const KIND_KEY: Record<BlockSection, string> = {
  trigger: "trigger",
  condition: "condition",
  action: "action",
};

/** Where a catalog block keeps its fields. */
const VALUES_KEY: Record<BlockSection, string> = {
  trigger: "options",
  condition: "options",
  action: "data",
};

function catalogFor({
  section,
  catalog,
}: {
  section: BlockSection;
  catalog: EditorCatalog | null;
}) {
  if (!catalog) return {};
  if (section === "trigger") return catalog.triggers;
  if (section === "condition") return catalog.conditions;

  return catalog.actions;
}

export type BlockTypesOptions = {
  section: BlockSection;
  catalog: EditorCatalog | null;
  /** Titles of the hand-made kinds in the UI language (`flow.titles`). */
  titles: Record<string, string>;
};

/**
 * Every block type that can be added to a section: the hand-made ones first, then all types HA
 * describes, sorted by name.
 */
export function blockTypes({ section, catalog, titles }: BlockTypesOptions): BlockType[] {
  const classic = CLASSIC_KINDS[section].map((kind): BlockType => ({
    key: kind,
    label: titles[`${kind}_${section}`] ?? titles[kind] ?? kind,
    icon: CLASSIC_ICON[kind] ?? CLASSIC_ICON.group ?? iconForSection(section),
    isClassic: true,
  }));
  const described = Object.entries(catalogFor({ section, catalog }))
    .map(([key, entry]): BlockType => ({
      key,
      label: entry.name,
      icon: iconForKey({ key, section }),
      isClassic: false,
    }))
    .sort((first, second) => first.label.localeCompare(second.label));

  return [...classic, ...described];
}

export type NewBlockOptions = {
  section: BlockSection;
  type: BlockType;
  catalog: EditorCatalog | null;
};

/**
 * The config of a new block. Catalog blocks get their required fields that have a default, like
 * HA's own editor does; everything else is left for the user.
 */
export function newBlock({ section, type, catalog }: NewBlockOptions): Raw {
  if (type.isClassic) return CLASSIC_TEMPLATES[section][type.key]?.() ?? {};

  const entry: CatalogEntry | undefined = catalogFor({ section, catalog })[type.key];
  const defaults = Object.fromEntries(
    Object.entries(entry?.fields ?? {})
      .filter(([, field]) => field.required && field.default !== undefined)
      .map(([name, field]) => [name, structuredClone(field.default)]),
  );
  const block: Raw = { [KIND_KEY[section]]: type.key };

  if (Object.keys(defaults).length > 0) block[VALUES_KEY[section]] = defaults;

  return block;
}
