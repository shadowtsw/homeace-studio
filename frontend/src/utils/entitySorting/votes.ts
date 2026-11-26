import { isSameOrBelow, pathAndAncestors } from "@/utils/categories/categoryPath";

import {
  COMMON_PARENT_SHARE,
  LIKELY_MARGIN,
  LIKELY_TOTAL,
  SURE_MARGIN,
  SURE_TOTAL,
} from "./constants";
import type { Confidence, HintKind, SortingReason } from "./model";

type Vote = { weight: number; reason: SortingReason; hint: HintKind };

export type AddVoteOptions = {
  folder: string;
  weight: number;
  reason: SortingReason;
  hint: HintKind;
};

/** Weighted votes per folder, collected from all hints of one bundle. */
export class FolderVotes {
  private readonly byFolder = new Map<string, Vote[]>();

  constructor(private readonly rejected: ReadonlySet<string> = new Set()) {}

  /** Turned-down folders (and everything below them) get no votes. */
  add({ folder, weight, reason, hint }: AddVoteOptions): void {
    const isRejected = [...this.rejected].some((path) =>
      isSameOrBelow({ path: folder, ancestor: path }),
    );

    if (weight <= 0 || isRejected) return;

    this.byFolder.set(folder, [...(this.byFolder.get(folder) ?? []), { weight, reason, hint }]);
  }

  get isEmpty(): boolean {
    return this.byFolder.size === 0;
  }

  entries(): [string, Vote[]][] {
    return [...this.byFolder.entries()];
  }
}

export type Decision = {
  target: string;
  confidence: Exclude<Confidence, "rule">;
  reasons: SortingReason[];
  hintKinds: HintKind[];
  alternatives: string[];
};

const MAX_REASONS = 2;
const MAX_ALTERNATIVES = 2;

const depthOf = (path: string): number => path.split("/").length;
const sumOf = (votes: Vote[]): number => votes.reduce((sum, vote) => sum + vote.weight, 0);

/**
 * Picks the folder: the deepest one holding COMMON_PARENT_SHARE of all votes, so votes for
 * "Haus/Küche/Licht" and "Haus/Küche/Kochen" end in "Haus/Küche". Never a bare main folder when
 * votes went below it ("Haus" alone says too little). Confidence comes from the lead over the best
 * folder elsewhere.
 */
export function decide(votes: FolderVotes): Decision | null {
  const entries = votes.entries();
  const total = entries.reduce((sum, [, list]) => sum + sumOf(list), 0);

  if (total <= 0) return null;

  const mass = new Map<string, number>();
  entries.forEach(([folder, list]) =>
    pathAndAncestors(folder).forEach((level) =>
      mass.set(level, (mass.get(level) ?? 0) + sumOf(list)),
    ),
  );
  const massOf = (path: string): number => mass.get(path) ?? 0;

  let best: string | null = null;
  mass.forEach((value, path) => {
    const isDeeper =
      !best ||
      depthOf(path) > depthOf(best) ||
      (depthOf(path) === depthOf(best) && value > massOf(best));
    if (value >= COMMON_PARENT_SHARE * total && isDeeper) best = path;
  });
  best ??=
    entries.map(([folder]) => folder).sort((first, second) => massOf(second) - massOf(first))[0] ??
    null;
  if (!best) return null;

  if (depthOf(best) === 1) {
    const parent = best;
    const children = [...mass.keys()].filter(
      (path) => depthOf(path) === 2 && isSameOrBelow({ path, ancestor: parent }),
    );
    best = children.sort((first, second) => massOf(second) - massOf(first))[0] ?? best;
  }

  const target = best;
  const isRelated = (path: string): boolean =>
    isSameOrBelow({ path, ancestor: target }) || isSameOrBelow({ path: target, ancestor: path });
  const competitors = new Map<string, number>();

  entries.forEach(([folder, list]) => {
    if (isRelated(folder)) return;

    const level =
      pathAndAncestors(folder)[Math.min(depthOf(folder), depthOf(target)) - 1] ?? folder;
    if (!isRelated(level)) competitors.set(level, (competitors.get(level) ?? 0) + sumOf(list));
  });

  const second = Math.max(0, ...competitors.values());
  const margin = (massOf(target) - second) / total;
  const confidence =
    margin >= SURE_MARGIN && total >= SURE_TOTAL
      ? "sure"
      : margin >= LIKELY_MARGIN && total >= LIKELY_TOTAL
        ? "likely"
        : "unclear";

  const supporting = entries
    .filter(([folder]) => isSameOrBelow({ path: folder, ancestor: target }))
    .flatMap(([, list]) => list)
    .sort((first, second) => second.weight - first.weight);
  const reasons = uniqueReasons(supporting.map((vote) => vote.reason));
  const shown = reasons.slice(0, MAX_REASONS);
  if (reasons.length > MAX_REASONS)
    shown.push({ kind: "more", count: reasons.length - MAX_REASONS });

  return {
    target,
    confidence,
    reasons: shown,
    hintKinds: [...new Set(supporting.map((vote) => vote.hint))],
    alternatives: [...competitors.entries()]
      .sort((first, second) => second[1] - first[1])
      .slice(0, MAX_ALTERNATIVES)
      .map(([path]) => path),
  };
}

function uniqueReasons(reasons: SortingReason[]): SortingReason[] {
  const seen = new Set<string>();

  return reasons.filter((reason) => {
    const key = JSON.stringify(reason);
    if (seen.has(key)) return false;

    seen.add(key);
    return true;
  });
}
