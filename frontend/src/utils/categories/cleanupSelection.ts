import { CATEGORY_SEPARATOR } from "@/constants/entries";
import type {
  CleanupChange,
  CleanupProposal,
  MergeProposal,
  ScopeCounts,
  SplitProposal,
} from "@/services/cleanupService";

/** A proposal as the dialog edits it: ticked or not, with the user's target name. */
export type SplitChoice = SplitProposal & { isOn: boolean };
export type MergeChoice = MergeProposal & { isOn: boolean };
export type CleanupChoice = SplitChoice | MergeChoice;

/** Nothing is ticked at first: every line is the user's decision. */
export function toChoices(proposals: CleanupProposal[]): CleanupChoice[] {
  return proposals.map((proposal) => ({ ...proposal, isOn: false }));
}

/** Like the backend: trims every level; null when a level is empty. */
export function normalizeFolderPath(path: string): string | null {
  const levels = path.split(CATEGORY_SEPARATOR).map((level) => level.trim());

  return levels.some((level) => level === "") ? null : levels.join(CATEGORY_SEPARATOR);
}

/** The changes to send: ticked lines with a valid target, merges as one change per other name. */
export function toChanges(choices: CleanupChoice[]): CleanupChange[] {
  const changes: CleanupChange[] = [];

  for (const choice of choices) {
    if (!choice.isOn) continue;

    if (choice.kind === "split") {
      const to = normalizeFolderPath(choice.to);

      if (to && to !== choice.from) changes.push({ from: choice.from, to });
      continue;
    }

    for (const name of choice.names) {
      if (name !== choice.to) changes.push({ from: name, to: choice.to });
    }
  }

  return changes;
}

/** Another ticked line that ends in the same folder; HA then merges them. */
export function sameTargetAs(choice: SplitChoice, choices: CleanupChoice[]): SplitChoice | null {
  if (!choice.isOn) return null;

  const target = normalizeFolderPath(choice.to);

  return (
    choices.find(
      (other): other is SplitChoice =>
        other !== choice &&
        other.kind === "split" &&
        other.isOn &&
        normalizeFolderPath(other.to) === target,
    ) ?? null
  );
}

export function totalCount(counts: ScopeCounts): number {
  return Object.values(counts).reduce((sum, count) => sum + (count ?? 0), 0);
}
