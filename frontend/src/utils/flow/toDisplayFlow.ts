import type {
  AddTarget,
  BlockChip,
  BlockSection,
  CatalogEntry,
  CatalogField,
  ChipEdit,
  ConfigPath,
  DisplayBlock,
  DisplayBranch,
  DisplayFlow,
  EditorCatalog,
  Flow,
  ValueEditor,
} from "@/types/editor";

import { CLASSIC_ICON, iconForKey, iconForSection } from "./blockIcons";
import { parsePath } from "./configPath";
import { formatDuration, formatEntities, formatValue, type FormatTexts } from "./formatValue";
import {
  ADDABLE_CLASSIC_FIELDS,
  classicFieldEditor,
  domainsOf,
  editorForSelector,
  isRequiredClassicField,
} from "./valueEditors";

/** Texts the converter needs; filled from the locale files by the caller. */
export type FlowTexts = FormatTexts & {
  /** Titles of hand-made blocks by kind, plus "unknown". */
  titles: Record<string, string>;
  /** Labels of classic fields and branches ("to", "for", "then", "else", …). */
  labels: Record<string, string>;
  /** Labels of fixed choices like "sunset" or "mon". */
  choices: Record<string, string>;
  /** Title of the entity editor, e.g. "Entität". */
  entity: string;
};

/** Names for target IDs that are neither entities nor areas; IDs without a name show as they are. */
export type TargetNames = {
  floors: Record<string, string>;
  labels: Record<string, string>;
};

const NO_TARGET_NAMES: TargetNames = { floors: {}, labels: {} };

type Raw = Record<string, unknown>;

type Context = {
  catalog: EditorCatalog | null;
  names: Record<string, string>;
  targetNames: TargetNames;
  texts: FlowTexts;
};

const PATH_SEPARATOR = ".";
/** What HA does when the config has no `mode`. */
const DEFAULT_MODE = "single";
const KEY_SEPARATOR = ".";

/** Classic trigger kinds HA keeps outside the catalog, with the fields shown as chips. */
const CLASSIC_TRIGGER_FIELDS: Record<string, string[]> = {
  state: ["attribute", "from", "to", "for"],
  numeric_state: ["attribute", "above", "below", "for"],
  time: ["at"],
  time_pattern: ["hours", "minutes", "seconds"],
  sun: ["event", "offset"],
  template: ["value_template", "for"],
  event: ["event_type"],
  homeassistant: ["event"],
};

const CLASSIC_CONDITION_FIELDS: Record<string, string[]> = {
  state: ["attribute", "state", "for"],
  numeric_state: ["attribute", "above", "below"],
  template: ["value_template"],
  time: ["after", "before", "weekday"],
  sun: ["after", "before"],
  zone: ["zone"],
  trigger: ["id"],
};

/** Condition kinds that only group other conditions. */
const GROUP_CONDITIONS = ["and", "or", "not"];

/** Fields that hold a duration in classic blocks. */
const DURATION_FIELDS = new Set(["for", "offset", "delay", "timeout"]);

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

const asList = (value: unknown): unknown[] =>
  value === undefined || value === null ? [] : Array.isArray(value) ? value : [value];
const asRecord = (value: unknown): Raw =>
  value && typeof value === "object" && !Array.isArray(value) ? (value as Raw) : {};
const asText = (value: unknown): string | undefined =>
  typeof value === "string" ? value : undefined;
/** For blocks whose single value needs no name, like the duration of "Warten". */
const unlabeled = (chips: BlockChip[]): BlockChip[] =>
  chips.map((chip) => ({ ...chip, label: undefined }));
const join = (path: string, part: string | number): string => `${path}${PATH_SEPARATOR}${part}`;
/** The first of these keys the config uses; the first one when none is set. */
const keyIn = (raw: Raw, keys: string[]): string => keys.find((key) => key in raw) ?? keys[0] ?? "";

/**
 * Turns the stored config of an automation or script into blocks for the flow view.
 *
 * Nothing is dropped: blocks the editor does not know become "unknown" blocks with their raw
 * config, so the view can still list them and saving keeps them unchanged. Editable chips carry
 * their exact place in the config (`edit.path`), so an edit changes only that one value.
 */
export function toDisplayFlow(
  flow: Flow,
  catalog: EditorCatalog | null,
  texts: FlowTexts,
  targetNames: TargetNames = NO_TARGET_NAMES,
): DisplayFlow {
  const context: Context = { catalog, names: flow.entityNames, targetNames, texts };
  const config = flow.config;
  const mode = asText(config.mode) ?? DEFAULT_MODE;

  if (flow.kind === "script") {
    const sequence = addTarget("action", "sequence");

    return {
      mode,
      triggers: [],
      conditions: [],
      actions: actionBlocks(config.sequence, "sequence", context),
      add: { triggers: sequence, conditions: sequence, actions: sequence },
    };
  }

  // New syntax (triggers/conditions/actions) with a fallback to the old one; paths use the key
  // the config really has.
  const triggerKey = keyIn(config, ["triggers", "trigger"]);
  const conditionKey = keyIn(config, ["conditions", "condition"]);
  const actionKey = keyIn(config, ["actions", "action"]);

  return {
    mode,
    triggers: triggerBlocks(config[triggerKey], triggerKey, context),
    conditions: conditionBlocks(config[conditionKey], conditionKey, context),
    actions: actionBlocks(config[actionKey], actionKey, context),
    add: {
      triggers: addTarget("trigger", triggerKey),
      conditions: addTarget("condition", conditionKey),
      actions: addTarget("action", actionKey),
    },
  };
}

const addTarget = (section: BlockSection, path: string): AddTarget => ({
  section,
  listPath: parsePath(path),
});

/**
 * Builds the blocks of one list and tells each where it sits, for moving, duplicating and
 * deleting. HA allows a single item instead of a list; it counts as a list of one.
 */
function listBlocks(
  value: unknown,
  path: string,
  build: (raw: unknown, id: string) => DisplayBlock,
): DisplayBlock[] {
  const items = asList(value);
  const listPath = parsePath(path);

  return items.map((raw, index) => {
    const block = build(raw, join(path, index));
    block.position = { listPath, index, count: items.length };
    return block;
  });
}

function triggerBlocks(value: unknown, path: string, context: Context): DisplayBlock[] {
  return listBlocks(value, path, (raw, id) => triggerBlock(asRecord(raw), id, context));
}

// ---- triggers --------------------------------------------------------------------------

function triggerBlock(raw: Raw, id: string, context: Context): DisplayBlock {
  const key = asText(raw.trigger) ?? asText(raw.platform) ?? "";
  const classicFields = CLASSIC_TRIGGER_FIELDS[key];

  if (classicFields) return classicBlock("trigger", key, raw, classicFields, id, context);

  return genericBlock("trigger", key, raw, "options", id, context);
}

// ---- conditions ------------------------------------------------------------------------

function conditionBlocks(value: unknown, path: string, context: Context): DisplayBlock[] {
  return listBlocks(value, path, (raw, id) => conditionBlock(raw, id, context));
}

function conditionBlock(value: unknown, id: string, context: Context): DisplayBlock {
  // A plain string is HA's shorthand for a template condition; editing replaces the string.
  if (typeof value === "string") {
    const block = classicBlock(
      "condition",
      "template",
      { value_template: value },
      ["value_template"],
      id,
      context,
    );
    const chip = block.chips[0];
    if (chip?.edit) chip.edit = { ...chip.edit, path: parsePath(id) };
    return block;
  }

  const raw = asRecord(value);
  const key = asText(raw.condition) ?? "";

  if (GROUP_CONDITIONS.includes(key)) {
    const block = baseBlock(
      "condition",
      CLASSIC_ICON.group ?? "",
      context.texts.titles[key] ?? key,
      id,
      raw,
    );
    const listPath = join(id, "conditions");
    block.branches = [
      {
        label: "",
        blocks: conditionBlocks(raw.conditions, listPath, context),
        add: [addTarget("condition", listPath)],
      },
    ];
    return block;
  }

  const classicFields = CLASSIC_CONDITION_FIELDS[key];

  if (classicFields) return classicBlock("condition", key, raw, classicFields, id, context);

  return genericBlock("condition", key, raw, "options", id, context);
}

// ---- actions ---------------------------------------------------------------------------

function actionBlocks(value: unknown, path: string, context: Context): DisplayBlock[] {
  return listBlocks(value, path, (raw, id) => actionBlock(asRecord(raw), id, context));
}

function actionBlock(raw: Raw, id: string, context: Context): DisplayBlock {
  const service = asText(raw.action) ?? asText(raw.service);

  if (service?.includes(KEY_SEPARATOR)) {
    return genericBlock("action", service, raw, keyIn(raw, ["data", "data_template"]), id, context);
  }

  if ("condition" in raw) return conditionBlock(raw, id, context);

  return structuralBlock(raw, id, context) ?? unknownBlock("action", raw, id, context);
}

/** Delay, if, choose, repeat, … : HA tells them apart by the key they contain. */
function structuralBlock(raw: Raw, id: string, context: Context): DisplayBlock | null {
  const { texts } = context;
  const make = (kind: string): DisplayBlock =>
    baseBlock(
      "action",
      CLASSIC_ICON[kind] ?? iconForSection("action"),
      texts.titles[kind] ?? kind,
      id,
      raw,
    );
  /** A branch whose blocks all come from one list of the given section. */
  const branch = (label: string, section: BlockSection, key: string): DisplayBranch => {
    const path = join(id, key);
    const blocks =
      section === "condition"
        ? conditionBlocks(raw[key], path, context)
        : section === "trigger"
          ? triggerBlocks(raw[key], path, context)
          : actionBlocks(raw[key], path, context);

    return { label: texts.labels[label] ?? label, blocks, add: [addTarget(section, path)] };
  };

  if ("delay" in raw) {
    const block = make("delay");
    block.chips = unlabeled(valueChips(raw, ["delay"], "delay", id, context));
    return block;
  }

  if ("if" in raw) {
    const block = make("if");
    block.branches = [
      branch("if", "condition", "if"),
      branch("thenBranch", "action", "then"),
      ...(raw.else ? [branch("else", "action", "else")] : []),
    ];
    return block;
  }

  if ("choose" in raw) {
    const block = make("choose");
    const options = asList(raw.choose).map((option, index): DisplayBranch => {
      const optionPath = join(join(id, "choose"), index);
      const conditionsPath = join(optionPath, "conditions");
      const sequencePath = join(optionPath, "sequence");
      const conditions = conditionBlocks(asRecord(option).conditions, conditionsPath, context);
      const sequence = actionBlocks(asRecord(option).sequence, sequencePath, context);

      return {
        label: `${texts.labels.option ?? "option"} ${index + 1}`,
        blocks: [...conditions, ...sequence],
        add: [addTarget("condition", conditionsPath), addTarget("action", sequencePath)],
      };
    });
    const fallback = raw.default ? [branch("default", "action", "default")] : [];
    block.branches = [...options, ...fallback];
    return block;
  }

  return loopOrWaitBlock(raw, id, context, make, branch);
}

function loopOrWaitBlock(
  raw: Raw,
  id: string,
  context: Context,
  make: (kind: string) => DisplayBlock,
  branch: (label: string, section: BlockSection, key: string) => DisplayBranch,
): DisplayBlock | null {
  const { texts } = context;

  if ("repeat" in raw) {
    const repeat = asRecord(raw.repeat);
    const block = make("repeat");
    const sequencePath = join(id, "repeat.sequence");
    block.chips = valueChips(
      repeat,
      ["count", "while", "until", "for_each"],
      "repeat",
      join(id, "repeat"),
      context,
    );
    block.branches = [
      {
        label: texts.labels.sequence ?? "sequence",
        blocks: actionBlocks(repeat.sequence, sequencePath, context),
        add: [addTarget("action", sequencePath)],
      },
    ];
    return block;
  }

  if ("parallel" in raw || "sequence" in raw) {
    const kind = "parallel" in raw ? "parallel" : "sequence";
    const block = make(kind);
    block.branches = [branch(kind, "action", kind)];
    return block;
  }

  if ("wait_for_trigger" in raw || "wait_template" in raw) {
    const block = make("wait");
    block.chips = valueChips(raw, ["wait_template", "timeout"], "wait", id, context);
    block.addable = addableClassic(raw, ["timeout"], "wait", id, context);
    block.branches =
      "wait_for_trigger" in raw ? [branch("until", "trigger", "wait_for_trigger")] : [];
    return block;
  }

  if ("variables" in raw) {
    const block = make("variables");
    block.chips = Object.keys(asRecord(raw.variables)).map((name) => ({
      kind: "text",
      text: name,
    }));
    return block;
  }

  if ("stop" in raw) {
    const block = make("stop");
    block.chips = unlabeled([
      ...valueChips(raw, ["stop"], "stop", id, context),
      ...missingChips(raw, ["stop"], "stop", id, context),
    ]);
    return block;
  }

  if ("event" in raw) {
    const block = make("event");
    block.chips = unlabeled(valueChips(raw, ["event"], "event", id, context));
    return block;
  }

  if ("scene" in raw) {
    const block = baseBlock(
      "action",
      iconForKey("scene", "action"),
      texts.titles.scene ?? "scene",
      id,
      raw,
    );
    block.chips = [
      entityChip(raw.scene, [...parsePath(id), "scene"], ["scene"], false, false, context),
    ];
    return block;
  }

  return null;
}

// ---- shared builders -------------------------------------------------------------------

function baseBlock(
  section: BlockSection,
  icon: string,
  title: string,
  id: string,
  raw: Raw,
): DisplayBlock {
  return {
    id,
    section,
    icon,
    title,
    chips: [],
    branches: [],
    // Set by listBlocks; every block comes from a list.
    position: { listPath: [], index: 0, count: 1 },
    isDisabled: raw.enabled === false,
    addable: [],
    isUnknown: false,
    raw,
  };
}

function catalogFor(
  section: BlockSection,
  catalog: EditorCatalog | null,
): Record<string, CatalogEntry> {
  if (!catalog) return {};
  if (section === "trigger") return catalog.triggers;
  if (section === "condition") return catalog.conditions;

  return catalog.actions;
}

/** An entity chip; editable with the entity picker. */
function entityChip(
  value: unknown,
  path: ConfigPath,
  domains: string[],
  isMultiple: boolean,
  isRemovable: boolean,
  context: Context,
  label?: string,
): BlockChip {
  return {
    kind: "entity",
    label,
    text: formatEntities(value, context.names),
    edit: {
      path,
      title: label ?? context.texts.entity,
      editor: { type: "entity", domains, isMultiple, areaPath: targetAreaPath(path) },
      value,
      isRemovable,
    },
  };
}

/**
 * A block of a type HA describes (catalog): title from HA, target entities, then set fields.
 *
 * @param valuesKey - Where the block keeps its fields: "options" (triggers, conditions) or
 *   "data" / "data_template" (actions).
 */
function genericBlock(
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

/** Required without a default: HA cannot run the block until the user sets it. */
const needsValue = (info: CatalogField): boolean => info.required && info.default === undefined;

function targetDomains(entry: CatalogEntry | undefined): string[] {
  return domainsOf(asRecord(entry?.target).entity);
}

function targetChips(
  raw: Raw,
  path: ConfigPath,
  entry: CatalogEntry | undefined,
  context: Context,
): BlockChip[] {
  const target = asRecord(raw.target);
  const { entity_id: entityIds, area_id: areaIds, device_id: deviceIds } = target;
  const domains = targetDomains(entry);
  const chips: BlockChip[] = [];

  if (entityIds) {
    chips.push(
      entityChip(entityIds, [...path, "target", "entity_id"], domains, true, true, context),
    );
  }

  // Old configs name the entity next to the action instead of in `target`.
  if (raw.entity_id) {
    chips.push(entityChip(raw.entity_id, [...path, "entity_id"], domains, true, false, context));
  }

  if (areaIds) {
    chips.push({
      kind: "entity",
      label: context.texts.labels.area,
      // Area IDs have no dot, so they share the name map with entities without clashes.
      text: formatEntities(areaIds, context.names),
      edit: {
        path: [...path, "target", "area_id"],
        title: context.texts.labels.area ?? "area",
        editor: { type: "area", isMultiple: true },
        value: areaIds,
        isRemovable: true,
      },
    });
  }

  if (deviceIds) {
    chips.push({
      kind: "entity",
      label: context.texts.labels.device,
      text: asList(deviceIds).join(", "),
    });
  }

  // Floors, labels and what the target leaves out are shown, not edited (yet); saving keeps them.
  if (target.floor_id) {
    chips.push({
      kind: "entity",
      label: context.texts.labels.floor,
      text: formatEntities(target.floor_id, context.targetNames.floors),
    });
  }

  if (target.label_id) {
    chips.push({
      kind: "entity",
      label: context.texts.labels.label,
      text: formatEntities(target.label_id, context.targetNames.labels),
    });
  }

  const excluded = excludedText(asRecord(target.exclude), context);

  if (excluded) {
    chips.push({ kind: "entity", label: context.texts.labels.exclude, text: excluded });
  }

  return chips;
}

/**
 * What `target.exclude` leaves out, by name: "Küche, Nachtlicht". It has the same keys as the
 * target itself (HA, 2026); unknown keys are ignored here and kept on save.
 */
function excludedText(exclude: Raw, context: Context): string {
  const { names, targetNames } = context;
  const parts = [
    exclude.entity_id && formatEntities(exclude.entity_id, names),
    exclude.area_id && formatEntities(exclude.area_id, names),
    exclude.device_id && asList(exclude.device_id).join(", "),
    exclude.floor_id && formatEntities(exclude.floor_id, targetNames.floors),
    exclude.label_id && formatEntities(exclude.label_id, targetNames.labels),
  ];

  return parts.filter((part): part is string => typeof part === "string" && part !== "").join(", ");
}

/** For `…target.entity_id` the sibling `…target.area_id`; HA then acts on everything in the area. */
function targetAreaPath(path: ConfigPath): ConfigPath | undefined {
  const isTarget =
    path.length >= 2 && path[path.length - 2] === "target" && path[path.length - 1] === "entity_id";

  return isTarget ? [...path.slice(0, -1), "area_id"] : undefined;
}

/** Set fields as "name: value"; fields still at their default are left out to keep it short. */
function fieldChips(
  values: Raw,
  valuesPath: ConfigPath,
  entry: CatalogEntry | undefined,
  context: Context,
): BlockChip[] {
  return Object.entries(values).flatMap(([field, value]): BlockChip[] => {
    const info = entry?.fields[field];
    const isDefault =
      info?.default !== undefined && JSON.stringify(info.default) === JSON.stringify(value);

    if (isDefault) return [];

    const selector = info?.selector ?? null;
    const label = info?.name ?? field;
    const text = formatValue(value, selector, context.names, context.texts);
    const editor = editorForSelector(selector, value);
    const edit: ChipEdit | undefined = editor
      ? {
          path: [...valuesPath, field],
          title: label,
          editor,
          value,
          isRemovable: info?.required !== true,
        }
      : undefined;

    return [{ kind: "value", label, text, edit }];
  });
}

/** HA says the block targets entities, but none (and no area, device, floor or label) is set yet. */
function missingTarget(
  raw: Raw,
  values: Raw,
  path: ConfigPath,
  entry: CatalogEntry | undefined,
  context: Context,
): BlockChip[] {
  const target = asRecord(raw.target);
  const hasTarget =
    target.entity_id ||
    target.area_id ||
    target.device_id ||
    target.floor_id ||
    target.label_id ||
    raw.entity_id ||
    values.entity_id;

  if (!entry?.target || hasTarget) return [];

  const chip = entityChip(
    undefined,
    [...path, "target", "entity_id"],
    targetDomains(entry),
    true,
    false,
    context,
  );

  return [{ ...chip, text: context.texts.entity, isMissing: true }];
}

/** Required catalog fields without a default that are not set yet. */
function missingFields(
  values: Raw,
  valuesPath: ConfigPath,
  entry: CatalogEntry | undefined,
): BlockChip[] {
  if (!entry) return [];

  return Object.entries(entry.fields).flatMap(([field, info]): BlockChip[] => {
    if (field in values || !needsValue(info)) return [];

    const editor = editorForSelector(info.selector, undefined);
    const title = info.name ?? field;

    if (!editor) return [];

    return [
      {
        kind: "value",
        text: title,
        isMissing: true,
        edit: { path: [...valuesPath, field], title, editor, value: undefined, isRemovable: false },
      },
    ];
  });
}

/** Optional catalog fields the block does not set yet. */
function addableFields(
  values: Raw,
  valuesPath: ConfigPath,
  entry: CatalogEntry | undefined,
): ChipEdit[] {
  if (!entry) return [];

  return Object.entries(entry.fields).flatMap(([field, info]): ChipEdit[] => {
    if (field in values || needsValue(info)) return [];

    const editor = editorForSelector(info.selector, undefined);

    if (!editor) return [];

    return [
      {
        path: [...valuesPath, field],
        title: info.name ?? field,
        editor,
        value: undefined,
        isRemovable: true,
      },
    ];
  });
}

/** Hand-made block: the kind's title, the entities of `entity_id`, then the listed fields. */
function classicBlock(
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

const isEmpty = (value: unknown): boolean => value === undefined || value === null || value === "";

/** Required fields that are still empty, as chips that ask for them (e.g. in a new block). */
function missingChips(
  raw: Raw,
  fields: string[],
  kind: string,
  id: string,
  context: Context,
): BlockChip[] {
  const path = parsePath(id);

  return fields
    .filter((field) => isEmpty(raw[field]))
    .flatMap((field): BlockChip[] => {
      const editor = classicFieldEditor(field, kind, raw);
      const label = context.texts.labels[field] ?? field;

      if (!editor) return [];

      const edit: ChipEdit = {
        path: [...path, field],
        title: label,
        editor: withChoiceLabels(editor, context),
        value: undefined,
        isRemovable: false,
      };

      return [{ kind: "value", text: label, isMissing: true, edit }];
    });
}

/** Choices show their label ("Sonnenuntergang"), everything else its formatted value. */
function chipText(field: string, value: unknown, editor: ValueEditor | null, context: Context) {
  const { texts } = context;

  if (editor?.type === "choice") {
    return asList(value)
      .map((item) => texts.choices[String(item)] ?? String(item))
      .join(", ");
  }

  if (DURATION_FIELDS.has(field)) return formatDuration(value, texts);

  return formatValue(value, null, context.names, texts);
}

function valueChips(
  raw: Raw,
  fields: string[],
  kind: string,
  id: string,
  context: Context,
): BlockChip[] {
  const path = parsePath(id);

  return fields
    .filter((field) => !isEmpty(raw[field]))
    .map((field): BlockChip => {
      const value = raw[field];
      const editor = classicFieldEditor(field, kind, raw);
      const label = context.texts.labels[field] ?? field;
      const edit: ChipEdit | undefined = editor
        ? {
            path: [...path, field],
            title: label,
            editor: withChoiceLabels(editor, context),
            value,
            isRemovable: !isRequiredClassicField(field),
          }
        : undefined;

      return { kind: "value", label, text: chipText(field, value, editor, context), edit };
    });
}

function addableClassic(
  raw: Raw,
  fields: string[],
  kind: string,
  id: string,
  context: Context,
): ChipEdit[] {
  const path = parsePath(id);

  return fields
    .filter((field) => raw[field] === undefined)
    .flatMap((field): ChipEdit[] => {
      const editor = classicFieldEditor(field, kind, raw);

      if (!editor) return [];

      return [
        {
          path: [...path, field],
          title: context.texts.labels[field] ?? field,
          editor: withChoiceLabels(editor, context),
          value: undefined,
          isRemovable: true,
        },
      ];
    });
}

function withChoiceLabels(editor: ValueEditor, context: Context): ValueEditor {
  if (editor.type !== "choice") return editor;

  return {
    ...editor,
    options: editor.options.map((option) => ({
      ...option,
      label: context.texts.choices[option.value] ?? option.label,
    })),
  };
}

function unknownBlock(section: BlockSection, raw: Raw, id: string, context: Context): DisplayBlock {
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
