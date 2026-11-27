import { isHexColor } from "./color";
import { deriveDarkColors } from "./deriveDark";
import {
  COLOR_MODES,
  FINE_TOKENS,
  MAX_THEME_NAME_LENGTH,
  MAX_THEME_TEXT_LENGTH,
  STANDARD_COLORS,
  THEME_COLOR_KEYS,
  THEME_FILE_FIELDS,
  THEME_FILE_VERSION,
  type CheckedTheme,
  type ColorMode,
  type FineTokens,
  type ThemeColors,
  type ThemeToken,
} from "./themeFormat";

/**
 * The check of a theme from outside (a file, pasted text, a request, stored data). It reads only
 * known fields and builds a new, clean object from them; the original never reaches the app. It has
 * no texts: every finding is a code, the frontend says it in the user's language.
 */

export const REPORT_KIND = { ok: "ok", warn: "warn", drop: "drop" } as const;
export type ReportKind = (typeof REPORT_KIND)[keyof typeof REPORT_KIND];

export const REPORT_CODE = {
  /** A valid theme file of {version}. */
  valid: "valid",
  /** The theme is dark only. */
  darkOnly: "darkOnly",
  /** No dark version; it was derived from the light one. */
  darkDerived: "darkDerived",
  /** HTML, invisible characters or overlength taken out of the name / author. */
  nameCleaned: "nameCleaned",
  authorCleaned: "authorCleaned",
  /** No usable name; the app gives one. */
  nameMissing: "nameMissing",
  /** A field the format does not know: {field}. */
  unknownField: "unknownField",
  /** A known field with a value of the wrong kind: {field}. */
  fieldInvalid: "fieldInvalid",
  /** A version ({mode}) that is no object. */
  versionInvalid: "versionInvalid",
  /** A colour ({mode}, {color}) is missing and was taken from Standard. */
  colorMissing: "colorMissing",
  /** A colour ({mode}, {color}) is no #rrggbb value ({value}) and was replaced. */
  colorInvalid: "colorInvalid",
  /** A field inside a version ({mode}) the format does not know: {field}. */
  unknownColor: "unknownColor",
  /** Fine-tuned values taken over: {count} ({mode}). */
  fineTokensKept: "fineTokensKept",
  /** A fine-tuned value ({mode}, {field}) that is no known colour token or no colour. */
  fineTokenDropped: "fineTokenDropped",
} as const;
export type ReportCode = (typeof REPORT_CODE)[keyof typeof REPORT_CODE];

export type ReportEntry = {
  kind: ReportKind;
  code: ReportCode;
  /** Values for the text; strings from the file are cleaned and short. */
  params: Record<string, string | number>;
};

export const CHECK_ERROR = {
  tooLarge: "tooLarge",
  notJson: "notJson",
  notTheme: "notTheme",
  markerMissing: "markerMissing",
  versionUnknown: "versionUnknown",
  versionNewer: "versionNewer",
  noColors: "noColors",
} as const;
export type CheckError = (typeof CHECK_ERROR)[keyof typeof CHECK_ERROR];

export type CheckResult =
  | { isValid: true; theme: CheckedTheme; report: ReportEntry[] }
  | { isValid: false; error: CheckError; report: ReportEntry[] };

/** How much of a foreign field name or value a report shows. */
const MAX_REPORTED_LENGTH = 30;
const KNOWN_FIELDS: ReadonlySet<string> = new Set(Object.values(THEME_FILE_FIELDS));
const COLOR_KEY_SET: ReadonlySet<string> = new Set(THEME_COLOR_KEYS);
const HTML_TAG = /<[^>]*>/g;

type Fields = Record<string, unknown>;

function isFields(value: unknown): value is Fields {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/** Only the object's own value: nothing from its prototype (no "__proto__" tricks). */
function ownValue(fields: Fields, key: string): unknown {
  return Object.prototype.hasOwnProperty.call(fields, key) ? fields[key] : undefined;
}

/**
 * Control characters, zero-width characters and the direction marks that can make a name read
 * backwards (U+202A–U+202E, U+2066–U+2069).
 */
function isInvisible(character: string): boolean {
  const code = character.codePointAt(0) ?? 0;
  const isControl = code < 0x20 || code === 0x7f;
  const isZeroWidthOrMark = code >= 0x200b && code <= 0x200f;
  const isDirection = (code >= 0x202a && code <= 0x202e) || (code >= 0x2066 && code <= 0x2069);

  return isControl || isZeroWidthOrMark || isDirection || code === 0xfeff;
}

/**
 * Plain text from a foreign string: no HTML tags, no invisible characters, at most `maxLength`
 * characters.
 *
 * @example cleanText({ text: "<b>Abend</b>rot‮", maxLength: 40 }) // "Abendrot"
 */
export function cleanText({ text, maxLength }: { text: string; maxLength: number }): string {
  const withoutTags = text.replace(HTML_TAG, "");
  const visible = [...withoutTags].filter((character) => !isInvisible(character));
  const trimmed = visible.join("").trim();

  return [...trimmed].slice(0, maxLength).join("");
}

function reported(value: unknown): string {
  return cleanText({ text: String(value), maxLength: MAX_REPORTED_LENGTH });
}

function failure(error: CheckError, report: ReportEntry[] = []): CheckResult {
  return { isValid: false, error, report };
}

function entry(
  kind: ReportKind,
  code: ReportCode,
  params: ReportEntry["params"] = {},
): ReportEntry {
  return { kind, code, params };
}

/** A name or author as plain text, with a report entry when something had to go. */
function readText({
  fields,
  field,
  cleanedCode,
  report,
}: {
  fields: Fields;
  field: string;
  cleanedCode: ReportCode;
  report: ReportEntry[];
}): string {
  const value = ownValue(fields, field);
  if (value === undefined) return "";
  if (typeof value !== "string") {
    report.push(entry(REPORT_KIND.drop, REPORT_CODE.fieldInvalid, { field }));
    return "";
  }

  const text = cleanText({ text: value, maxLength: MAX_THEME_NAME_LENGTH });
  if (text !== value.trim()) report.push(entry(REPORT_KIND.warn, cleanedCode));
  return text;
}

/** One colour of a version: a clean #rrggbb value, or Standard's with a report entry. */
function readColor({
  version,
  mode,
  key,
  report,
}: {
  version: Fields;
  mode: ColorMode;
  key: (typeof THEME_COLOR_KEYS)[number];
  report: ReportEntry[];
}): string {
  const value = ownValue(version, key);
  const trimmed = typeof value === "string" ? value.trim() : value;
  if (isHexColor(trimmed)) return trimmed.toLowerCase();

  if (value === undefined) {
    report.push(entry(REPORT_KIND.warn, REPORT_CODE.colorMissing, { mode, color: key }));
  } else {
    const params = { mode, color: key, value: reported(value) };
    report.push(entry(REPORT_KIND.drop, REPORT_CODE.colorInvalid, params));
  }
  return STANDARD_COLORS[mode][key];
}

/** The seven colours of one version; null when the file has no such version. */
function readVersion({
  fields,
  mode,
  report,
}: {
  fields: Fields;
  mode: ColorMode;
  report: ReportEntry[];
}): ThemeColors | null {
  const version = ownValue(fields, mode);
  if (version === undefined) return null;
  if (!isFields(version)) {
    report.push(entry(REPORT_KIND.drop, REPORT_CODE.versionInvalid, { mode }));
    return null;
  }

  const colors: ThemeColors = { ...STANDARD_COLORS[mode] };
  for (const key of THEME_COLOR_KEYS) colors[key] = readColor({ version, mode, key, report });

  const unknownKeys = Object.keys(version).filter((key) => !COLOR_KEY_SET.has(key));
  for (const key of unknownKeys) {
    report.push(
      entry(REPORT_KIND.drop, REPORT_CODE.unknownColor, {
        mode,
        field: reported(key),
      }),
    );
  }
  return colors;
}

/** The fine-tuned values of one version: known colour tokens with #rrggbb values only. */
function readFineTokensOf({
  tokens,
  mode,
  report,
}: {
  tokens: Fields;
  mode: ColorMode;
  report: ReportEntry[];
}): Partial<Record<ThemeToken, string>> {
  const kept: Partial<Record<ThemeToken, string>> = {};

  for (const token of FINE_TOKENS) {
    const value = ownValue(tokens, token);
    const trimmed = typeof value === "string" ? value.trim() : value;
    if (isHexColor(trimmed)) kept[token] = trimmed.toLowerCase();
  }

  const keptKeys = new Set(Object.keys(kept));
  const droppedKeys = Object.keys(tokens).filter((key) => !keptKeys.has(key));
  for (const key of droppedKeys) {
    const params = { mode, field: reported(key) };
    report.push(entry(REPORT_KIND.drop, REPORT_CODE.fineTokenDropped, params));
  }

  const keptCount = Object.keys(kept).length;
  if (keptCount > 0) {
    report.push(
      entry(REPORT_KIND.ok, REPORT_CODE.fineTokensKept, {
        mode,
        count: keptCount,
      }),
    );
  }
  return kept;
}

function readFineTokens({ fields, report }: { fields: Fields; report: ReportEntry[] }): FineTokens {
  const fineTokens: FineTokens = { light: {}, dark: {} };
  const value = ownValue(fields, THEME_FILE_FIELDS.fineTokens);
  if (value === undefined) return fineTokens;
  if (!isFields(value)) {
    const params = { field: THEME_FILE_FIELDS.fineTokens };
    report.push(entry(REPORT_KIND.drop, REPORT_CODE.fieldInvalid, params));
    return fineTokens;
  }

  for (const mode of COLOR_MODES) {
    const tokens = ownValue(value, mode);
    if (isFields(tokens)) fineTokens[mode] = readFineTokensOf({ tokens, mode, report });
  }

  const unknownKeys = Object.keys(value).filter((key) => !COLOR_MODES.some((mode) => mode === key));
  for (const key of unknownKeys) {
    const field = `${THEME_FILE_FIELDS.fineTokens}.${reported(key)}`;
    report.push(entry(REPORT_KIND.drop, REPORT_CODE.unknownField, { field }));
  }
  return fineTokens;
}

function readStrong({ fields, report }: { fields: Fields; report: ReportEntry[] }): boolean {
  const value = ownValue(fields, THEME_FILE_FIELDS.strong);
  if (value === undefined || typeof value === "boolean") return value === true;

  report.push(
    entry(REPORT_KIND.drop, REPORT_CODE.fieldInvalid, {
      field: THEME_FILE_FIELDS.strong,
    }),
  );
  return false;
}

/** Whether the file says it is a theme file of a version this app can read. */
function versionError(fields: Fields): CheckError | null {
  const version = ownValue(fields, THEME_FILE_FIELDS.marker);
  if (version === undefined) return CHECK_ERROR.markerMissing;

  const isVersionNumber = typeof version === "number" && Number.isInteger(version) && version >= 1;
  if (!isVersionNumber) return CHECK_ERROR.versionUnknown;
  if (version > THEME_FILE_VERSION) return CHECK_ERROR.versionNewer;

  return null;
}

/**
 * Checks a theme that is already parsed (a request body, stored data, the result of the gate).
 *
 * @param value - Anything; only the known fields of a theme file are read.
 * @returns The clean theme with a report of what was cleaned, replaced or dropped, or the reason it
 *   is no usable theme.
 */
export function checkThemeValue(value: unknown): CheckResult {
  // A theme file of a version we know
  if (!isFields(value)) return failure(CHECK_ERROR.notTheme);
  const error = versionError(value);
  if (error) return failure(error);

  const report: ReportEntry[] = [];
  const unknownFields = Object.keys(value).filter((key) => !KNOWN_FIELDS.has(key));
  for (const key of unknownFields) {
    report.push(
      entry(REPORT_KIND.drop, REPORT_CODE.unknownField, {
        field: reported(key),
      }),
    );
  }

  // Name and author as plain text
  const name = readText({
    fields: value,
    field: THEME_FILE_FIELDS.name,
    cleanedCode: REPORT_CODE.nameCleaned,
    report,
  });
  if (!name) report.push(entry(REPORT_KIND.warn, REPORT_CODE.nameMissing));
  const author = readText({
    fields: value,
    field: THEME_FILE_FIELDS.author,
    cleanedCode: REPORT_CODE.authorCleaned,
    report,
  });

  // The colours: at least one version; a missing dark one is derived
  const light = readVersion({ fields: value, mode: "light", report });
  const darkGiven = readVersion({ fields: value, mode: "dark", report });
  if (!light && !darkGiven) return failure(CHECK_ERROR.noColors, report);
  if (!light) report.push(entry(REPORT_KIND.ok, REPORT_CODE.darkOnly));
  if (light && !darkGiven) report.push(entry(REPORT_KIND.warn, REPORT_CODE.darkDerived));
  const dark = darkGiven ?? deriveDarkColors(light ?? STANDARD_COLORS.light);

  // Extras
  const isStrong = readStrong({ fields: value, report });
  const fineTokens = readFineTokens({ fields: value, report });

  report.unshift(entry(REPORT_KIND.ok, REPORT_CODE.valid, { version: THEME_FILE_VERSION }));
  const theme: CheckedTheme = {
    name,
    author: author || null,
    light,
    dark,
    isStrong,
    fineTokens,
  };

  return { isValid: true, theme, report };
}

/**
 * Checks the text of a theme file (a file or pasted text). Runs inside the gate (a Web Worker in
 * the browser), the backend checks the parsed result again with checkThemeValue.
 */
export function checkThemeText(text: unknown): CheckResult {
  if (typeof text !== "string") return failure(CHECK_ERROR.notTheme);
  if (text.length > MAX_THEME_TEXT_LENGTH) return failure(CHECK_ERROR.tooLarge);

  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    // Not JSON at all: the report says so, nothing is taken over
    return failure(CHECK_ERROR.notJson);
  }

  return checkThemeValue(parsed);
}
