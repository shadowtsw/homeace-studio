/** Settings as the UI sends them (camelCase); validated and mapped to HA's field names here. */
export type HelperSettings = Record<string, unknown>;

/** A setting is missing or invalid. `field` is the camelCase name the UI used. */
export class HelperSettingsError extends Error {
  constructor(readonly field: string) {
    super(`Invalid helper setting "${field}"`);
    this.name = HelperSettingsError.name;
  }
}

/* Readers: each returns a valid value or throws for that field. */

function isMissing(value: unknown): boolean {
  return value === undefined || value === null || value === "";
}

/** A finite number; the fallback when the field is empty and one is given. */
export function readNumber({
  settings,
  field,
  fallback,
}: {
  settings: HelperSettings;
  field: string;
  fallback?: number;
}): number {
  const value = settings[field];

  if (isMissing(value) && fallback !== undefined) return fallback;
  if (typeof value !== "number" || !Number.isFinite(value)) throw new HelperSettingsError(field);

  return value;
}

/** Like readNumber, but a whole number. */
export function readInteger({
  settings,
  field,
  fallback,
}: {
  settings: HelperSettings;
  field: string;
  fallback?: number;
}): number {
  const value = readNumber({ settings, field, fallback });

  if (!Number.isInteger(value)) throw new HelperSettingsError(field);

  return value;
}

/** A whole number, or undefined when the field is empty. */
export function readOptionalInteger({
  settings,
  field,
}: {
  settings: HelperSettings;
  field: string;
}): number | undefined {
  return isMissing(settings[field]) ? undefined : readInteger({ settings, field });
}

/** true or false; the fallback when the field is missing. */
export function readBoolean({
  settings,
  field,
  fallback,
}: {
  settings: HelperSettings;
  field: string;
  fallback: boolean;
}): boolean {
  const value = settings[field];

  if (value === undefined) return fallback;
  if (typeof value !== "boolean") throw new HelperSettingsError(field);

  return value;
}

/** Trimmed text, or undefined when the field is empty or blank. */
export function readOptionalString({
  settings,
  field,
}: {
  settings: HelperSettings;
  field: string;
}): string | undefined {
  const value = settings[field];

  if (isMissing(value)) return undefined;
  if (typeof value !== "string") throw new HelperSettingsError(field);

  return value.trim() || undefined;
}

type ReadChoiceOptions = {
  settings: HelperSettings;
  field: string;
  choices: readonly string[];
  fallback: string;
};

/** One of the allowed values; the fallback when the field is empty. */
export function readChoice({ settings, field, choices, fallback }: ReadChoiceOptions): string {
  const value = readOptionalString({ settings, field }) ?? fallback;

  if (!choices.includes(value)) throw new HelperSettingsError(field);

  return value;
}
