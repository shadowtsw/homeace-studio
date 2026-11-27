import { describe, expect, it, vi } from "vitest";

import { checkThemeText } from "@/core/themes/checkTheme";
import { STANDARD_COLORS, themeFileValue } from "@/core/themes/themeFormat";
import { floorFindings } from "@/utils/themes/floorReport";
import {
  readGateAnswer,
  runThemeGate,
  runThemeGateOnFile,
  type GateWorker,
} from "@/utils/themes/themeGate";

const GOOD_TEXT = JSON.stringify({
  "homeace-theme": 1,
  name: "Abendrot",
  dark: STANDARD_COLORS.dark,
});

/** A worker that runs the real check, like the gate's own process. */
function honestWorker(): GateWorker {
  const worker: GateWorker = {
    onmessage: null,
    onerror: null,
    postMessage(message) {
      const result = checkThemeText(message);
      const answer = result.isValid
        ? { isValid: true, file: themeFileValue(result.theme), report: result.report }
        : result;
      queueMicrotask(() => worker.onmessage?.({ data: answer } as MessageEvent<unknown>));
    },
    terminate: vi.fn<() => void>(),
  };
  return worker;
}

function silentWorker(): GateWorker {
  return {
    onmessage: null,
    onerror: null,
    postMessage: () => undefined,
    terminate: vi.fn<() => void>(),
  };
}

describe("runThemeGate", () => {
  it("checks in the worker and ends it afterwards", async () => {
    const worker = honestWorker();
    const result = await runThemeGate({ text: GOOD_TEXT, startGateWorker: () => worker });

    expect(result.isValid).toBe(true);
    expect(worker.terminate).toHaveBeenCalled();
  });

  it("ends a worker that takes too long", async () => {
    const worker = silentWorker();
    const result = await runThemeGate({
      text: GOOD_TEXT,
      startGateWorker: () => worker,
      timeLimitMs: 10,
    });

    expect(result).toMatchObject({ isValid: false, error: "gateTooSlow" });
    expect(worker.terminate).toHaveBeenCalled();
  });

  it("takes nothing when the worker cannot start", async () => {
    const result = await runThemeGate({
      text: GOOD_TEXT,
      startGateWorker: () => {
        throw new Error("no workers here");
      },
    });

    expect(result).toMatchObject({ isValid: false, error: "gateUnavailable" });
  });

  it("does not hand an oversized text to the worker at all", async () => {
    const start = vi.fn<() => GateWorker>(honestWorker);
    const result = await runThemeGate({ text: " ".repeat(70_000), startGateWorker: start });

    expect(result).toMatchObject({ isValid: false, error: "tooLarge" });
    expect(start).not.toHaveBeenCalled();
  });

  it("checks a file's size before reading it", async () => {
    const file = new Blob([" ".repeat(70_000)]);

    expect(await runThemeGateOnFile(file)).toMatchObject({ isValid: false, error: "tooLarge" });
  });
});

describe("readGateAnswer", () => {
  it("checks the worker's theme once more and keeps only known report lines", () => {
    const answer = {
      isValid: true,
      file: { "homeace-theme": 1, name: "<i>x</i>", dark: STANDARD_COLORS.dark, extra: 1 },
      report: [
        { kind: "ok", code: "valid", params: { version: 1 } },
        { kind: "evil", code: "valid", params: {} },
        { kind: "drop", code: "unknown-code", params: {} },
        { kind: "warn", code: "nameCleaned", params: { field: { nested: true } } },
      ],
    };
    const result = readGateAnswer(answer);

    expect(result.isValid && result.theme.name).toBe("x");
    expect(result.report.map((line) => line.code)).toEqual(["valid", "nameCleaned"]);
    expect(result.report[1]?.params).toEqual({});
  });

  it("treats anything odd as a broken gate", () => {
    expect(readGateAnswer("nonsense")).toMatchObject({ isValid: false, error: "gateUnavailable" });
    expect(readGateAnswer({ isValid: false, error: "made-up" })).toMatchObject({
      error: "gateUnavailable",
    });
  });
});

describe("floorFindings", () => {
  it("says when text gets adjusted and a fine value is dropped", () => {
    const unreadable = {
      ...STANDARD_COLORS.dark,
      text: STANDARD_COLORS.dark.surface,
    };
    const findings = floorFindings({
      name: "Grau",
      author: null,
      light: null,
      dark: unreadable,
      isStrong: false,
      fineTokens: { light: {}, dark: { "--fg": STANDARD_COLORS.dark.surface } },
    });

    expect(findings.map((finding) => finding.code)).toEqual([
      "textAdjusted",
      "fineTokenUnreadable",
    ]);
  });

  it("says readable when nothing needs adjusting", () => {
    const findings = floorFindings({
      name: "Standard",
      author: null,
      light: STANDARD_COLORS.light,
      dark: STANDARD_COLORS.dark,
      isStrong: false,
      fineTokens: { light: {}, dark: {} },
    });

    expect(findings.map((finding) => finding.code)).toEqual(["readable"]);
  });
});
