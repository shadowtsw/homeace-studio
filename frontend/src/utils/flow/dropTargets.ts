import type { AddTarget, BlockSection, DisplayBlock, DisplayFlow } from "@/types/editor";

/**
 * A list of a flow that takes a dropped entity: a whole section ("Dann") or a branch inside it
 * ("dann" / "sonst" of a Wenn block, the actions of a choose option).
 */
export type DropTarget = AddTarget & {
  /** Stable within one flow; also the element's `data-drop-key`. */
  key: string;
  /** The section it lives in; only lists of the same kind count (no conditions inside "Dann"). */
  root: BlockSection;
  /** Null for the section itself; `context` says which branch (its condition, else the block). */
  branch: { label: string; context: string } | null;
  depth: number;
  /** How many blocks the list has now: the new one gets this index. */
  count: number;
};

export const dropKey = (target: AddTarget): string =>
  `${target.section}:${target.listPath.join(".")}`;

/**
 * What a branch belongs to: the condition of its block ("Lawn moisture unter 20"), so "Dann" of a
 * Wenn block cannot be taken for the section "Dann". Without a condition, the block's title.
 */
function contextOf(block: DisplayBlock): string {
  const conditions = block.branches.find((branch) =>
    branch.add.some((target) => target.section === "condition"),
  );
  const sentences = (conditions?.blocks ?? []).map((item) =>
    item.chips
      .filter((chip) => !chip.isMissing)
      .map((chip) => (chip.label ? `${chip.label} ${chip.text}` : chip.text))
      .join(" "),
  );
  const summary = sentences.filter(Boolean).join(" · ");

  return summary || block.title;
}

function nestedTargets(blocks: DisplayBlock[], root: BlockSection, depth: number): DropTarget[] {
  return blocks.flatMap((block) =>
    block.branches.flatMap((branch) => [
      ...branch.add
        .filter((target) => target.section === root)
        .map((target) => ({
          ...target,
          key: dropKey(target),
          root,
          branch: { label: branch.label, context: contextOf(block) },
          depth,
          count: branch.blocks.length,
        })),
      ...nestedTargets(branch.blocks, root, depth + 1),
    ]),
  );
}

/** Every list of a flow an entity can be dropped into, sections first, branches in order. */
export function dropTargets(flow: DisplayFlow): DropTarget[] {
  const sections: [BlockSection, DisplayBlock[], AddTarget][] = [
    ["trigger", flow.triggers, flow.add.triggers],
    ["condition", flow.conditions, flow.add.conditions],
    ["action", flow.actions, flow.add.actions],
  ];

  return sections.flatMap(([root, blocks, add]) => [
    { ...add, key: dropKey(add), root, branch: null, depth: 0, count: blocks.length },
    ...nestedTargets(blocks, root, 1),
  ]);
}

/** The branches inside a section; when there are some, a drop on the section asks where exactly. */
export function branchesOf(targets: readonly DropTarget[], root: BlockSection): DropTarget[] {
  return targets.filter((target) => target.root === root && target.depth > 0);
}

/** The config id the next block of a list gets, e.g. "actions.0.then.2". */
export function nextBlockId(target: DropTarget): string {
  return [...target.listPath, target.count].join(".");
}
