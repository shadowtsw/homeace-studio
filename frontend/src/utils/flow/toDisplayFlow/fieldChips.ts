import type {
  BlockChip,
  CatalogEntry,
  CatalogField,
  ChipEdit,
  ConfigPath,
  ValueEditor,
} from "@/types/editor";

import { parsePath } from "../configPath";
import { formatDuration, formatValue } from "../formatValue";
import { classicFieldEditor, editorForSelector, isRequiredClassicField } from "../valueEditors";
import { asList, type Context, type Raw } from "./context";

/** Fields that hold a duration in classic blocks. */
const DURATION_FIELDS = new Set(["for", "offset", "delay", "timeout"]);

/** Required without a default: HA cannot run the block until the user sets it. */
const needsValue = (info: CatalogField): boolean => info.required && info.default === undefined;

export type FieldChipsOptions = {
  values: Raw;
  valuesPath: ConfigPath;
  entry: CatalogEntry | undefined;
  context: Context;
};

/** Set fields as "name: value"; fields still at their default are left out to keep it short. */
export function fieldChips({ values, valuesPath, entry, context }: FieldChipsOptions): BlockChip[] {
  return Object.entries(values).flatMap(([field, value]): BlockChip[] => {
    const info = entry?.fields[field];
    const isDefault =
      info?.default !== undefined && JSON.stringify(info.default) === JSON.stringify(value);

    if (isDefault) return [];

    const selector = info?.selector ?? null;
    const label = info?.name ?? field;
    const text = formatValue({ value, selector, entityNames: context.names, texts: context.texts });
    const editor = editorForSelector({ selector, value });
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

export type MissingFieldsOptions = {
  values: Raw;
  valuesPath: ConfigPath;
  entry: CatalogEntry | undefined;
};

/** Required catalog fields without a default that are not set yet. */
export function missingFields({ values, valuesPath, entry }: MissingFieldsOptions): BlockChip[] {
  if (!entry) return [];

  return Object.entries(entry.fields).flatMap(([field, info]): BlockChip[] => {
    if (field in values || !needsValue(info)) return [];

    const editor = editorForSelector({ selector: info.selector, value: undefined });
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

export type AddableFieldsOptions = {
  values: Raw;
  valuesPath: ConfigPath;
  entry: CatalogEntry | undefined;
};

/** Optional catalog fields the block does not set yet. */
export function addableFields({ values, valuesPath, entry }: AddableFieldsOptions): ChipEdit[] {
  if (!entry) return [];

  return Object.entries(entry.fields).flatMap(([field, info]): ChipEdit[] => {
    if (field in values || needsValue(info)) return [];

    const editor = editorForSelector({ selector: info.selector, value: undefined });

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

const isEmpty = (value: unknown): boolean => value === undefined || value === null || value === "";

export type MissingChipsOptions = {
  raw: Raw;
  fields: string[];
  kind: string;
  id: string;
  context: Context;
};

/** Required fields that are still empty, as chips that ask for them (e.g. in a new block). */
export function missingChips({ raw, fields, kind, id, context }: MissingChipsOptions): BlockChip[] {
  const path = parsePath(id);

  return fields
    .filter((field) => isEmpty(raw[field]))
    .flatMap((field): BlockChip[] => {
      const editor = classicFieldEditor({ field, kind, raw });
      const label = context.texts.labels[field] ?? field;

      if (!editor) return [];

      const edit: ChipEdit = {
        path: [...path, field],
        title: label,
        editor: withChoiceLabels({ editor, context }),
        value: undefined,
        isRemovable: false,
      };

      return [{ kind: "value", text: label, isMissing: true, edit }];
    });
}

type ChipTextOptions = {
  field: string;
  value: unknown;
  editor: ValueEditor | null;
  context: Context;
};

/** Choices show their label ("Sonnenuntergang"), everything else its formatted value. */
function chipText({ field, value, editor, context }: ChipTextOptions) {
  const { texts } = context;

  if (editor?.type === "choice") {
    return asList(value)
      .map((item) => texts.choices[String(item)] ?? String(item))
      .join(", ");
  }

  if (DURATION_FIELDS.has(field)) return formatDuration({ value, texts });

  return formatValue({ value, selector: null, entityNames: context.names, texts });
}

export type ValueChipsOptions = {
  raw: Raw;
  fields: string[];
  kind: string;
  id: string;
  context: Context;
};

export function valueChips({ raw, fields, kind, id, context }: ValueChipsOptions): BlockChip[] {
  const path = parsePath(id);

  return fields
    .filter((field) => !isEmpty(raw[field]))
    .map((field): BlockChip => {
      const value = raw[field];
      const editor = classicFieldEditor({ field, kind, raw });
      const label = context.texts.labels[field] ?? field;
      const edit: ChipEdit | undefined = editor
        ? {
            path: [...path, field],
            title: label,
            editor: withChoiceLabels({ editor, context }),
            value,
            isRemovable: !isRequiredClassicField(field),
          }
        : undefined;

      return { kind: "value", label, text: chipText({ field, value, editor, context }), edit };
    });
}

export type AddableClassicOptions = {
  raw: Raw;
  fields: string[];
  kind: string;
  id: string;
  context: Context;
};

export function addableClassic({
  raw,
  fields,
  kind,
  id,
  context,
}: AddableClassicOptions): ChipEdit[] {
  const path = parsePath(id);

  return fields
    .filter((field) => raw[field] === undefined)
    .flatMap((field): ChipEdit[] => {
      const editor = classicFieldEditor({ field, kind, raw });

      if (!editor) return [];

      return [
        {
          path: [...path, field],
          title: context.texts.labels[field] ?? field,
          editor: withChoiceLabels({ editor, context }),
          value: undefined,
          isRemovable: true,
        },
      ];
    });
}

function withChoiceLabels({
  editor,
  context,
}: {
  editor: ValueEditor;
  context: Context;
}): ValueEditor {
  if (editor.type !== "choice") return editor;

  return {
    ...editor,
    options: editor.options.map((option) => ({
      ...option,
      label: context.texts.choices[option.value] ?? option.label,
    })),
  };
}
