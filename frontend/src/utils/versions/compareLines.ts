import type { BlockChip, BlockSection, DisplayBlock, DisplayFlow } from "@/types/editor";

/** The parts a version is compared in: name and settings, a flow's three lists, or a scene's devices. */
export type LineSection = "about" | BlockSection | "state";

export const LINE_SECTIONS: readonly LineSection[] = [
  "about",
  "trigger",
  "condition",
  "action",
  "state",
];

/** One block (or one scene device) as a single line of the compare view. */
export type VersionLine = {
  /** Lines with the same key are the same block in both versions; their text may differ. */
  key: string;
  section: LineSection;
  /** Nesting below if/choose branches. */
  depth: number;
  icon: string;
  title: string;
  /** Everything else of the block in one line: its chips, or a device's state. */
  text: string;
};

export type LineChange = "same" | "changed" | "onlyOld" | "onlyNew";

/** One row of the side-by-side view: the older line left, the newer right. */
export type LineRow = {
  section: LineSection;
  older: VersionLine | null;
  newer: VersionLine | null;
  change: LineChange;
};

/** The blocks of a flow, flattened into lines; branch blocks follow their parent, one level deeper. */
export function linesOfFlow(flow: DisplayFlow): VersionLine[] {
  return [...flow.triggers, ...flow.conditions, ...flow.actions].flatMap((block) =>
    linesOfBlock({ block, depth: 0 }),
  );
}

function linesOfBlock({ block, depth }: { block: DisplayBlock; depth: number }): VersionLine[] {
  const own: VersionLine = {
    key: blockKey(block),
    section: block.section,
    depth,
    icon: block.icon,
    title: block.title,
    text: block.chips.map(chipText).join(" · "),
  };
  const nested = block.branches.flatMap((branch) =>
    branch.blocks.flatMap((inner) => linesOfBlock({ block: inner, depth: depth + 1 })),
  );

  return [own, ...nested];
}

/** A block stays "the same" while its kind and its entities stay; values may change. */
function blockKey(block: DisplayBlock): string {
  const entities = block.chips.filter((chip) => chip.kind === "entity").map((chip) => chip.text);

  return [block.section, block.title, ...entities].join("|");
}

function chipText(chip: BlockChip): string {
  return chip.label ? `${chip.label} ${chip.text}` : chip.text;
}

export type SceneDeviceLine = { entityId: string; name: string; icon: string; text: string };

/** A scene's devices as lines, sorted by name so the order in scenes.yaml does not matter. */
export function linesOfScene(devices: readonly SceneDeviceLine[]): VersionLine[] {
  return [...devices]
    .sort((a, b) => a.name.localeCompare(b.name))
    .map((device) => ({
      key: device.entityId,
      section: "state",
      depth: 0,
      icon: device.icon,
      title: device.name,
      text: device.text,
    }));
}

/**
 * Pairs the lines of two versions, section by section, keeping both orders (longest common
 * subsequence of the keys). Unpaired lines stay on their side with a gap on the other.
 */
export function alignLines({
  older,
  newer,
}: {
  older: readonly VersionLine[];
  newer: readonly VersionLine[];
}): LineRow[] {
  return LINE_SECTIONS.flatMap((section) =>
    alignSection({
      section,
      older: older.filter((line) => line.section === section),
      newer: newer.filter((line) => line.section === section),
    }),
  );
}

function alignSection({
  section,
  older,
  newer,
}: {
  section: LineSection;
  older: VersionLine[];
  newer: VersionLine[];
}): LineRow[] {
  // common(i, j) = length of the longest common key sequence of older[i..] and newer[j..]
  const width = newer.length + 1;
  const table = Array.from({ length: (older.length + 1) * width }, () => 0);
  const common = (i: number, j: number): number => table[i * width + j] ?? 0;
  for (let i = older.length - 1; i >= 0; i--) {
    for (let j = newer.length - 1; j >= 0; j--) {
      const isSame = older[i]?.key === newer[j]?.key;
      table[i * width + j] = isSame
        ? common(i + 1, j + 1) + 1
        : Math.max(common(i + 1, j), common(i, j + 1));
    }
  }

  const rows: LineRow[] = [];
  let i = 0;
  let j = 0;
  while (i < older.length || j < newer.length) {
    const left = older[i];
    const right = newer[j];
    if (left && right && left.key === right.key) {
      const change = left.text === right.text ? "same" : "changed";
      rows.push({ section, older: left, newer: right, change });
      i++;
      j++;
    } else if (left && (!right || common(i + 1, j) >= common(i, j + 1))) {
      rows.push({ section, older: left, newer: null, change: "onlyOld" });
      i++;
    } else {
      rows.push({ section, older: null, newer: right ?? null, change: "onlyNew" });
      j++;
    }
  }
  return rows;
}

export type ChangeSummary = {
  /** Titles of lines whose content changed, in order. */
  changed: string[];
  /** Lines only in the newer version, per section. */
  added: Partial<Record<LineSection, number>>;
  /** Lines only in the older version, per section. */
  removed: Partial<Record<LineSection, number>>;
};

/** What changed from the older to the newer version, for the one-line summary in the list. */
export function summarizeRows(rows: readonly LineRow[]): ChangeSummary {
  const summary: ChangeSummary = { changed: [], added: {}, removed: {} };
  for (const row of rows) {
    // Name, description and mode count as "changed" also when they were added or removed.
    const line = row.newer ?? row.older;
    if (row.section === "about" && row.change !== "same" && line) {
      summary.changed.push(line.title);
      continue;
    }
    if (row.change === "changed" && row.newer) summary.changed.push(row.newer.title);
    if (row.change === "onlyNew")
      summary.added[row.section] = (summary.added[row.section] ?? 0) + 1;
    if (row.change === "onlyOld") {
      summary.removed[row.section] = (summary.removed[row.section] ?? 0) + 1;
    }
  }
  return summary;
}
