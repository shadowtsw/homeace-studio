import type { ChoiceOption, ValueEditor } from "@/types/editor";

type Raw = Record<string, unknown>;

/** Choice values of classic fields; their labels come from `flow.choices` in the locale. */
export const SUN_EVENTS = ["sunrise", "sunset"];
export const HA_EVENTS = ["start", "shutdown"];
export const WEEKDAYS = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"];

/** Fields a classic block cannot do without; all others can be removed and added. */
const REQUIRED_CLASSIC_FIELDS = new Set([
  "at",
  "event",
  "value_template",
  "event_type",
  "state",
  "zone",
  "id",
  "delay",
  "wait_template",
  "count",
  "stop",
]);

/** Optional fields of classic blocks that can be added when missing, by section and kind. */
export const ADDABLE_CLASSIC_FIELDS: Record<"trigger" | "condition", Record<string, string[]>> = {
  trigger: {
    state: ["attribute", "from", "to", "for"],
    numeric_state: ["attribute", "above", "below", "for"],
    sun: ["offset"],
    template: ["for"],
  },
  condition: {
    state: ["attribute", "for"],
    numeric_state: ["attribute", "above", "below"],
    time: ["after", "before", "weekday"],
    sun: ["after", "before"],
  },
};

/** Entities whose state a numeric limit can come from instead of a fixed number. */
const NUMBER_SOURCE_DOMAINS = ["sensor", "input_number", "number"];
const DURATION_FIELDS = new Set(["for", "offset", "timeout", "delay"]);
const TEMPLATE_FIELDS = new Set(["value_template", "wait_template"]);
const TEXT_FIELDS = new Set([
  "attribute",
  "event_type",
  "hours",
  "minutes",
  "seconds",
  "id",
  "stop",
]);
const STATE_FIELDS = new Set(["from", "to", "state"]);
const TIME_FIELDS = new Set(["at", "after", "before"]);
/** "07:30" or "07:30:00". */
const TIME_PATTERN = /^\d{1,2}:\d{2}(:\d{2})?$/;
const TEMPLATE_START = "{{";
const TEMPLATE_BLOCK_START = "{%";

const asRecord = (value: unknown): Raw =>
  value && typeof value === "object" && !Array.isArray(value) ? (value as Raw) : {};
const asList = (value: unknown): unknown[] =>
  value === undefined || value === null ? [] : Array.isArray(value) ? value : [value];
const asNumber = (value: unknown): number | undefined =>
  typeof value === "number" ? value : undefined;

/** A Jinja template like "{{ states('sensor.x') }}"; edited as text, never as its value. */
export function isTemplate(value: unknown): boolean {
  return (
    typeof value === "string" &&
    (value.includes(TEMPLATE_START) || value.includes(TEMPLATE_BLOCK_START))
  );
}

/** The entity IDs of an `entity_id` value (string, list, or missing). */
export function entityIdsOf(value: unknown): string[] {
  return asList(value).filter((item): item is string => typeof item === "string");
}

/**
 * The domains an HA entity filter allows, e.g. `{ domain: ["light", "switch"] }` or a list of
 * such filters (selectors and catalog targets use both forms).
 */
export function domainsOf(filter: unknown): string[] {
  const domains = asList(filter).flatMap((item) => asList(asRecord(item).domain));

  return [...new Set(domains.filter((domain): domain is string => typeof domain === "string"))];
}

export type EditorForSelectorOptions = {
  /** e.g. `{ number: { min: 0, max: 100, unit_of_measurement: "%" } }`. */
  selector: Record<string, unknown> | null;
  /** The current value; a template always gets the template editor. */
  value: unknown;
};

/**
 * Chooses the editor for a field HA describes with a selector.
 *
 * @returns null when the value cannot be edited as a chip (objects, lists of objects, …).
 */
export function editorForSelector({
  selector,
  value,
}: EditorForSelectorOptions): ValueEditor | null {
  if (isTemplate(value)) return { type: "template" };

  const type = selector ? Object.keys(selector)[0] : undefined;
  const options = asRecord(type ? selector?.[type] : undefined);
  const isMultiple = options.multiple === true;

  switch (type) {
    case "entity":
      return {
        type: "entity",
        domains: [...domainsOf(options.filter), ...domainsOf(options)],
        isMultiple,
      };
    case "area":
      return { type: "area", isMultiple };
    case "number":
      return numberEditor({ options, value });
    case "color_temp":
      return numberEditor({
        options: { ...options, unit_of_measurement: options.unit === "kelvin" ? "K" : "mired" },
        value,
      });
    case "boolean":
      return { type: "boolean" };
    case "select":
      return {
        type: "choice",
        options: selectOptions({ options: options.options, value }),
        isMultiple,
      };
    case "duration":
      return { type: "duration" };
    case "time":
      return { type: "time" };
    case "date":
      return { type: "date" };
    case "text":
      return { type: "text", isMultiline: options.multiline === true };
    case "template":
      return { type: "template" };
    case "icon":
      return { type: "text", isMultiline: false };
    case "state":
      return { type: "text", isMultiline: false, stateOf: entityIdsOf(options.entity_id) };
    default:
      return editorForValue(value);
  }
}

/** Without a selector the value itself decides: numbers, yes/no and text can be edited. */
export function editorForValue(value: unknown): ValueEditor | null {
  if (isTemplate(value)) return { type: "template" };
  if (typeof value === "number") return { type: "number" };
  if (typeof value === "boolean") return { type: "boolean" };
  if (typeof value === "string" || value === undefined) {
    return { type: "text", isMultiline: false };
  }

  return null;
}

export type ClassicFieldEditorOptions = {
  field: string;
  /** The block kind, e.g. "sun"; decides between same-named fields like `event`. */
  kind: string;
  /** The whole block, so state fields can suggest the states of its entities. */
  raw: Raw;
};

/**
 * The editor of a field of a classic block (state trigger, delay, time condition, …).
 */
export function classicFieldEditor({
  field,
  kind,
  raw,
}: ClassicFieldEditorOptions): ValueEditor | null {
  const value = raw[field];

  if (isTemplate(value) || TEMPLATE_FIELDS.has(field)) return { type: "template" };
  if (Array.isArray(value) && field !== "weekday") return null;
  if (DURATION_FIELDS.has(field)) return { type: "duration" };

  if (STATE_FIELDS.has(field)) {
    return { type: "text", isMultiline: false, stateOf: entityIdsOf(raw.entity_id) };
  }

  if (field === "above" || field === "below") {
    return typeof value === "string"
      ? { type: "entity", domains: NUMBER_SOURCE_DOMAINS, isMultiple: false }
      : { type: "number" };
  }

  if (kind === "sun" && (field === "event" || field === "after" || field === "before")) {
    return choiceEditor({ values: SUN_EVENTS, isMultiple: false });
  }

  if (kind === "homeassistant" && field === "event")
    return choiceEditor({ values: HA_EVENTS, isMultiple: false });

  if (TIME_FIELDS.has(field)) {
    return value === undefined || (typeof value === "string" && TIME_PATTERN.test(value))
      ? { type: "time" }
      : null;
  }

  if (field === "weekday") return choiceEditor({ values: WEEKDAYS, isMultiple: true });
  if (field === "zone") return { type: "entity", domains: ["zone"], isMultiple: false };
  if (field === "count") return { type: "number", min: 1 };
  if (field === "event" || TEXT_FIELDS.has(field)) return { type: "text", isMultiline: false };

  return null;
}

export function isRequiredClassicField(field: string): boolean {
  return REQUIRED_CLASSIC_FIELDS.has(field);
}

/** Choice options whose labels the caller fills from the locale (`flow.choices`). */
function choiceEditor({
  values,
  isMultiple,
}: {
  values: string[];
  isMultiple: boolean;
}): ValueEditor {
  return { type: "choice", options: values.map((value) => ({ value, label: value })), isMultiple };
}

function numberEditor({ options, value }: { options: Raw; value: unknown }): ValueEditor {
  // A number field may hold an entity ID or text in old configs; then it is edited as text.
  if (value !== undefined && typeof value !== "number") return { type: "text", isMultiline: false };

  const unit = options.unit_of_measurement;

  return {
    type: "number",
    min: asNumber(options.min),
    max: asNumber(options.max),
    step: asNumber(options.step),
    unit: typeof unit === "string" ? unit : undefined,
  };
}

/** HA select options are strings or `{ value, label }`; the current value is always offered. */
function selectOptions({ options, value }: { options: unknown; value: unknown }): ChoiceOption[] {
  const list = asList(options).map((option): ChoiceOption => {
    if (typeof option === "string") return { value: option, label: option };

    const record = asRecord(option);
    const optionValue = String(record.value ?? "");

    return { value: optionValue, label: String(record.label ?? optionValue) };
  });
  const current = entityIdsOf(value).filter((item) => !list.some((o) => o.value === item));

  return [...list, ...current.map((item) => ({ value: item, label: item }))];
}
