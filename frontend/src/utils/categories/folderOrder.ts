import { CATEGORY_SEPARATOR } from "@/constants/entries";

import type { CategoryNode } from "./categoryTree";

/** Parent path ("" for the top level) → its subfolders in the user's order. */
export type FolderOrder = Readonly<Record<string, readonly string[]>>;

/** "Haus/Terrasse" → "Haus", "Haus" → "". */
export function parentOf(path: string): string {
  const index = path.lastIndexOf(CATEGORY_SEPARATOR);
  return index < 0 ? "" : path.slice(0, index);
}

/**
 * The tree in the user's order: listed folders first in that order, the rest after them as they
 * came (A–Z). Returns new arrays; the nodes themselves are shared.
 */
export function applyFolderOrder(
  nodes: readonly CategoryNode[],
  order: FolderOrder,
  parent = "",
): CategoryNode[] {
  const wanted = order[parent] ?? [];
  const rank = (path: string): number => {
    const index = wanted.indexOf(path);
    return index < 0 ? Number.MAX_SAFE_INTEGER : index;
  };

  return [...nodes]
    .map((node, index) => ({ node, index }))
    .sort((a, b) => rank(a.node.path) - rank(b.node.path) || a.index - b.index)
    .map(({ node }) => ({ ...node, children: applyFolderOrder(node.children, order, node.path) }));
}

/**
 * The siblings after moving one folder before or after another.
 *
 * @example moveSibling(["A", "B", "C"], "C", "A", true) // ["C", "A", "B"]
 */
export function moveSibling(
  siblings: readonly string[],
  moved: string,
  target: string,
  isBefore: boolean,
): string[] {
  const rest = siblings.filter((path) => path !== moved);
  const index = rest.indexOf(target);
  if (index < 0) return [...siblings];

  rest.splice(isBefore ? index : index + 1, 0, moved);
  return rest;
}
