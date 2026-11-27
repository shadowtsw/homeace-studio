import { REPORT_KIND, type ReportEntry, type ReportKind } from "@/core/themes/checkTheme";
import { COLOR_MODES, type CheckedTheme } from "@/core/themes/themeFormat";

import { deriveTokens, withFineTokens } from "./tokens";

/** What the floor did to an imported theme; said in the check report next to the gate's findings. */
export const FLOOR_CODE = {
  /** Text was below the floor on its background ({mode}) and was made readable. */
  textAdjusted: "textAdjusted",
  /** A fine-tuned value ({mode}, {field}) would have made something unreadable and was dropped. */
  fineTokenUnreadable: "fineTokenUnreadable",
  /** Nothing to adjust: readable everywhere. */
  readable: "readable",
} as const;
export type FloorCode = (typeof FLOOR_CODE)[keyof typeof FLOOR_CODE];

/** A line of the check report, from the gate or from the floor. */
export type ThemeReportLine = {
  kind: ReportKind;
  code: ReportEntry["code"] | FloorCode;
  params: ReportEntry["params"];
};

/**
 * What the hard floor will change on a checked theme, per version: text it makes readable and
 * fine-tuned values it drops. The theme itself stays as it is; the floor works when it is shown.
 */
export function floorFindings(theme: CheckedTheme): ThemeReportLine[] {
  const findings: ThemeReportLine[] = [];

  for (const mode of COLOR_MODES) {
    const colors = theme[mode];
    if (!colors) continue;

    const derived = deriveTokens({ colors, mode, isStrong: theme.isStrong });
    if (derived["--fg"] !== colors.text) {
      findings.push({ kind: REPORT_KIND.warn, code: FLOOR_CODE.textAdjusted, params: { mode } });
    }
    const { droppedTokens } = withFineTokens({
      tokens: derived,
      fineTokens: theme.fineTokens[mode],
    });
    for (const field of droppedTokens) {
      const params = { mode, field };
      findings.push({ kind: REPORT_KIND.drop, code: FLOOR_CODE.fineTokenUnreadable, params });
    }
  }

  if (findings.length === 0) {
    findings.push({ kind: REPORT_KIND.ok, code: FLOOR_CODE.readable, params: {} });
  }
  return findings;
}
