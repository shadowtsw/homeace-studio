import {
  CHECK_ERROR,
  REPORT_CODE,
  REPORT_KIND,
  checkThemeValue,
  cleanText,
  type CheckError,
  type ReportEntry,
} from "@/core/themes/checkTheme";
import {
  MAX_THEME_TEXT_LENGTH,
  type CheckedTheme,
  type ThemeFileValue,
} from "@/core/themes/themeFormat";
import { isRecord } from "@/utils/record";

/**
 * The gate for themes from outside (a file, pasted text): the check runs in a Web Worker of its
 * own, with a size check before anything is read and a time limit. What comes out is a new, clean
 * theme object; the original text never reaches the app.
 */

/** Errors of the gate itself, next to those of the check. */
export const GATE_ERROR = {
  /** The worker could not start or broke; nothing is taken over (no check without the gate). */
  unavailable: "gateUnavailable",
  /** The check took too long and was ended. */
  tooSlow: "gateTooSlow",
} as const;
export type GateError = (typeof GATE_ERROR)[keyof typeof GATE_ERROR];

export type GateResult =
  | { isValid: true; theme: CheckedTheme; report: ReportEntry[] }
  | { isValid: false; error: CheckError | GateError; report: ReportEntry[] };

/** What the worker sends back: the theme in the file format, so the page can check it again. */
export type GateMessage =
  | { isValid: true; file: ThemeFileValue; report: ReportEntry[] }
  | { isValid: false; error: CheckError; report: ReportEntry[] };

/** A theme is checked in milliseconds; this long means something is wrong with the text. */
export const GATE_TIME_LIMIT_MS = 2000;
/** How much of a value from the report is shown. */
const MAX_PARAM_LENGTH = 40;

/** The part of a Worker the gate uses, so tests can hand in their own. */
export type GateWorker = {
  onmessage: ((event: MessageEvent<unknown>) => void) | null;
  onerror: ((event: ErrorEvent) => void) | null;
  postMessage(message: unknown): void;
  terminate(): void;
};

function startWorker(): GateWorker {
  return new Worker(new URL("./themeCheck.worker.ts", import.meta.url), { type: "module" });
}

function failure(error: CheckError | GateError): GateResult {
  return { isValid: false, error, report: [] };
}

const REPORT_KINDS = Object.values(REPORT_KIND);
const REPORT_CODES = Object.values(REPORT_CODE);
const CHECK_ERRORS: ReadonlySet<unknown> = new Set(Object.values(CHECK_ERROR));

function isCheckError(value: unknown): value is CheckError {
  return CHECK_ERRORS.has(value);
}

/** Only string and number values, short and as plain text. */
function readParams(value: unknown): ReportEntry["params"] {
  const entries = Object.entries(isRecord(value) ? value : {});
  const kept = entries.flatMap(([key, param]): [string, string | number][] => {
    if (typeof param === "number" && Number.isFinite(param)) return [[key, param]];
    if (typeof param === "string")
      return [[key, cleanText({ text: param, maxLength: MAX_PARAM_LENGTH })]];
    return [];
  });

  return Object.fromEntries(kept);
}

/** The report as data: known kinds and codes only. */
function readReport(value: unknown): ReportEntry[] {
  if (!Array.isArray(value)) return [];

  return value.flatMap((entry): ReportEntry[] => {
    if (!isRecord(entry)) return [];

    const kind = REPORT_KINDS.find((known) => known === entry.kind);
    const code = REPORT_CODES.find((known) => known === entry.code);
    if (!kind || !code) return [];

    return [{ kind, code, params: readParams(entry.params) }];
  });
}

/**
 * The worker's answer, checked once more in the page: the theme goes through the same rules, so
 * only a clean object can leave the gate, whatever the worker sent.
 */
export function readGateAnswer(answer: unknown): GateResult {
  if (!isRecord(answer)) return failure(GATE_ERROR.unavailable);

  const report = readReport(answer.report);
  if (answer.isValid !== true) {
    const error = isCheckError(answer.error) ? answer.error : GATE_ERROR.unavailable;
    return { isValid: false, error, report };
  }

  const again = checkThemeValue(answer.file);
  if (!again.isValid) return again;
  return { isValid: true, theme: again.theme, report };
}

export type RunThemeGateOptions = {
  text: string;
  /** Tests hand in their own worker. */
  startGateWorker?: () => GateWorker;
  timeLimitMs?: number;
};

/**
 * Checks the text of a theme file in the gate.
 *
 * @returns The clean theme with the report, or why it is no usable theme. Never throws.
 */
export function runThemeGate({
  text,
  startGateWorker = startWorker,
  timeLimitMs = GATE_TIME_LIMIT_MS,
}: RunThemeGateOptions): Promise<GateResult> {
  // Too large: not even handed to the worker
  if (text.length > MAX_THEME_TEXT_LENGTH) return Promise.resolve(failure(CHECK_ERROR.tooLarge));

  let worker: GateWorker;
  try {
    worker = startGateWorker();
  } catch (error) {
    console.error("The theme gate could not start", error);
    return Promise.resolve(failure(GATE_ERROR.unavailable));
  }

  return new Promise((resolve) => {
    let isDone = false;
    const timer = setTimeout(() => finish(failure(GATE_ERROR.tooSlow)), timeLimitMs);

    function finish(result: GateResult): void {
      if (isDone) return;

      isDone = true;
      clearTimeout(timer);
      worker.terminate();
      resolve(result);
    }

    worker.onmessage = (event) => finish(readGateAnswer(event.data));
    worker.onerror = (event) => {
      event.preventDefault();
      console.error("The theme gate broke", event);
      finish(failure(GATE_ERROR.unavailable));
    };
    worker.postMessage(text);
  });
}

/**
 * Checks a theme file in the gate. The size is checked before the file is read.
 *
 * @param file - From a file input; its name is not used.
 */
export async function runThemeGateOnFile(file: Blob): Promise<GateResult> {
  if (file.size > MAX_THEME_TEXT_LENGTH) return failure(CHECK_ERROR.tooLarge);

  let text: string;
  try {
    text = await file.text();
  } catch (error) {
    console.error("Reading the theme file failed", error);
    return failure(CHECK_ERROR.notTheme);
  }
  return runThemeGate({ text });
}
