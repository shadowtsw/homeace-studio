import { describe, expect, it } from "vitest";

import type { CleanupProposal } from "@/services/cleanupService";

import {
  normalizeFolderPath,
  sameTargetAs,
  toChanges,
  toChoices,
  type SplitChoice,
} from "../cleanupSelection";

const PROPOSALS: CleanupProposal[] = [
  {
    key: "split:Büro - Licht",
    kind: "split",
    from: "Büro - Licht",
    to: "Büro/Licht",
    isCertain: true,
    counts: { automation: 2 },
  },
  {
    key: "split:Büro-Licht",
    kind: "split",
    from: "Büro-Licht",
    to: "Büro/Licht",
    isCertain: false,
    counts: { helpers: 1 },
  },
  {
    key: "merge:Routine|Routinen",
    kind: "merge",
    names: ["Routine", "Routinen"],
    to: "Routinen",
    counts: { Routine: { script: 1 }, Routinen: { script: 2 } },
  },
];

describe("clean-up selection", () => {
  it("starts with nothing ticked, so every line is the user's decision", () => {
    expect(toChoices(PROPOSALS).every((choice) => !choice.isOn)).toBe(true);
    expect(toChanges(toChoices(PROPOSALS))).toEqual([]);
  });

  it("sends ticked lines with clean targets and merges as one change per other name", () => {
    const choices = toChoices(PROPOSALS).map((choice) => ({ ...choice, isOn: true }));
    (choices[0] as SplitChoice).to = " Büro / Licht ";

    expect(toChanges(choices)).toEqual([
      { from: "Büro - Licht", to: "Büro/Licht" },
      { from: "Büro-Licht", to: "Büro/Licht" },
      { from: "Routine", to: "Routinen" },
    ]);
  });

  it("skips invalid targets and points out lines that end in the same folder", () => {
    const choices = toChoices(PROPOSALS).map((choice) => ({ ...choice, isOn: true }));
    const first = choices[0] as SplitChoice;
    const second = choices[1] as SplitChoice;

    expect(sameTargetAs(second, choices)?.from).toBe("Büro - Licht");

    second.to = "Büro//";
    expect(normalizeFolderPath(second.to)).toBeNull();
    expect(sameTargetAs(first, choices)).toBeNull();
    expect(toChanges(choices).map((change) => change.from)).not.toContain("Büro-Licht");
  });
});
