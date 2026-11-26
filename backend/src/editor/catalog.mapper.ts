import type { CatalogEntry, CatalogField, EditorCatalog } from "./editor.model";

/**
 * A trigger, condition or action description, as `trigger_platforms/subscribe` or `get_services`
 * sends it. Only `get_services` has `name` / `description`: English, or a script's own alias.
 */
export type HaPlatformDescription = {
  name?: string;
  description?: string;
  fields?: Record<string, HaFieldDescription>;
  target?: unknown;
};

/** One field description; sections (like `temperature_range`) contain their own `fields`. */
export type HaFieldDescription = {
  name?: string;
  description?: string;
  required?: boolean;
  default?: unknown;
  selector?: Record<string, unknown>;
  fields?: Record<string, HaFieldDescription>;
};

/** `get_services`: domain → service → description. */
export type HaServices = Record<string, Record<string, HaPlatformDescription>>;

/** `frontend/get_translations` resources: flat keys like "component.zone.triggers.entered.name". */
export type HaTranslations = Record<string, string>;

export type CatalogSources = {
  triggers: Record<string, HaPlatformDescription>;
  conditions: Record<string, HaPlatformDescription>;
  services: HaServices;
  translations: { triggers: HaTranslations; conditions: HaTranslations; services: HaTranslations };
};

const KEY_SEPARATOR = ".";

/**
 * Combines HA's descriptions with their translations into one catalog for the editor.
 *
 * Keys stay as HA uses them in configs ("zone.entered", "climate.set_temperature"). Field sections
 * are flattened, because a config stores their fields side by side.
 */
export function buildCatalog(sources: CatalogSources): EditorCatalog {
  const actionDescriptions: Record<string, HaPlatformDescription> = {};

  for (const [domain, services] of Object.entries(sources.services)) {
    for (const [service, description] of Object.entries(services)) {
      actionDescriptions[domain + KEY_SEPARATOR + service] = description;
    }
  }

  return {
    triggers: mapEntries({
      descriptions: sources.triggers,
      category: "triggers",
      translations: sources.translations.triggers,
    }),
    conditions: mapEntries({
      descriptions: sources.conditions,
      category: "conditions",
      translations: sources.translations.conditions,
    }),
    actions: mapEntries({
      descriptions: actionDescriptions,
      category: "services",
      translations: sources.translations.services,
    }),
  };
}

function mapEntries({
  descriptions,
  category,
  translations,
}: {
  descriptions: Record<string, HaPlatformDescription>;
  category: string;
  translations: HaTranslations;
}): Record<string, CatalogEntry> {
  const entries = Object.entries(descriptions).map(([key, description]): [string, CatalogEntry] => {
    const prefix = translationPrefix({ key, category });
    const fields = flattenFields(description.fields ?? {});
    const mappedFields = Object.fromEntries(
      Object.entries(fields).map(([fieldKey, field]): [string, CatalogField] => [
        fieldKey,
        {
          name: translations[`${prefix}.fields.${fieldKey}.name`] ?? filled(field.name),
          description:
            translations[`${prefix}.fields.${fieldKey}.description`] ?? filled(field.description),
          required: field.required ?? false,
          ...(field.default !== undefined ? { default: field.default } : {}),
          selector: field.selector ?? null,
        },
      ]),
    );

    return [
      key,
      {
        name: translations[`${prefix}.name`] ?? filled(description.name) ?? key,
        description: translations[`${prefix}.description`] ?? filled(description.description),
        fields: mappedFields,
        target: description.target ?? null,
      },
    ];
  });

  return Object.fromEntries(entries);
}

/**
 * HA's own text when there is no translation, e.g. the alias of a script (each script is its own action
 * "script.<key>" without translations). HA sends "" for a missing description.
 */
const filled = (value: string | undefined): string | null => (value?.trim() ? value : null);

/**
 * Where HA keeps the texts of a key: "zone.entered" → "component.zone.triggers.entered".
 * A key without a dot is the domain's default ("component.sun.triggers._").
 */
function translationPrefix({ key, category }: { key: string; category: string }): string {
  const [domain, ...rest] = key.split(KEY_SEPARATOR);
  const name = rest.length > 0 ? rest.join(KEY_SEPARATOR) : "_";

  return `component.${domain}.${category}.${name}`;
}

function flattenFields(
  fields: Record<string, HaFieldDescription>,
): Record<string, HaFieldDescription> {
  const flat: Record<string, HaFieldDescription> = {};

  for (const [key, field] of Object.entries(fields)) {
    if (field.fields) {
      Object.assign(flat, flattenFields(field.fields));
    } else {
      flat[key] = field;
    }
  }

  return flat;
}
