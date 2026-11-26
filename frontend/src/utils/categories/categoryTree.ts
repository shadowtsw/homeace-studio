import { CATEGORY_SEPARATOR } from "@/constants/entries";

export type CategoryNode = {
  /** Full path, e.g. "Haus/Terrasse"; also the HA category name if the node is a real category. */
  path: string;
  /** Last level only, e.g. "Terrasse". */
  name: string;
  children: CategoryNode[];
  /** Entries sorted directly into this category. */
  ownCount: number;
  /** Entries in this category and everything below it. */
  totalCount: number;
  /**
   * True when no entry sits directly here, e.g. "Arbeitszimmer" above "Arbeitszimmer/Heizung".
   * Such a node is only a folder in the UI; HA has no category for it (no empty categories).
   */
  isFolderOnly: boolean;
  /** Created by the user as an empty folder (overlay); it can be deleted while it holds nothing. */
  isSavedFolder: boolean;
  /**
   * HA has a category with this path in some scope, maybe not in the one shown. Such a folder
   * stays in the tree for every scope and is never offered for deletion as an empty folder.
   */
  isCategory: boolean;
};

/**
 * Builds the folder tree from HA category names that use "/" for levels.
 *
 * @param categoryPaths - One path per entry (so repeats count entries); null means "no category"
 *   and is skipped.
 * @param savedFolders - Empty folders the user created; they appear even without entries.
 * @param allCategoryPaths - Category paths of every scope. They add folders without counting, so
 *   the tree keeps its shape when a scope tab shows only automations or only helpers.
 * @returns Top-level nodes, each level sorted by name (case-insensitive).
 * @example buildCategoryTree(["Haus/Terrasse", "Haus"])
 *   // [{ path: "Haus", ownCount: 1, totalCount: 2, children: [{ path: "Haus/Terrasse", … }] }]
 */
export function buildCategoryTree(
  categoryPaths: readonly (string | null)[],
  savedFolders: readonly string[] = [],
  allCategoryPaths: readonly (string | null)[] = [],
): CategoryNode[] {
  const roots: CategoryNode[] = [];
  const nodesByPath = new Map<string, CategoryNode>();

  for (const folder of savedFolders) {
    ensureNode(folder, roots, nodesByPath).isSavedFolder = true;
  }

  for (const path of [...categoryPaths, ...allCategoryPaths]) {
    if (!path) continue;

    const node = ensureNode(path, roots, nodesByPath);
    node.isFolderOnly = false;
    node.isCategory = true;
  }

  for (const path of categoryPaths) {
    if (path) ensureNode(path, roots, nodesByPath).ownCount++;
  }

  roots.forEach(sumTotalCounts);
  sortByName(roots);

  return roots;
}

/** Walks the levels of `path` and creates missing nodes on the way; returns the deepest one. */
function ensureNode(
  path: string,
  roots: CategoryNode[],
  nodesByPath: Map<string, CategoryNode>,
): CategoryNode {
  const segments = path.split(CATEGORY_SEPARATOR);
  let siblings = roots;
  let current: CategoryNode | null = null;

  for (const [index, name] of segments.entries()) {
    const nodePath = segments.slice(0, index + 1).join(CATEGORY_SEPARATOR);
    current = nodesByPath.get(nodePath) ?? addNode(nodePath, name, siblings, nodesByPath);
    siblings = current.children;
  }

  // split() always returns at least one segment, so the loop ran at least once.
  if (!current) {
    throw new Error(`Category path "${path}" has no levels`);
  }

  return current;
}

function addNode(
  path: string,
  name: string,
  siblings: CategoryNode[],
  nodesByPath: Map<string, CategoryNode>,
): CategoryNode {
  const node: CategoryNode = {
    path,
    name,
    children: [],
    ownCount: 0,
    totalCount: 0,
    isFolderOnly: true,
    isSavedFolder: false,
    isCategory: false,
  };

  siblings.push(node);
  nodesByPath.set(path, node);

  return node;
}

function sumTotalCounts(node: CategoryNode): number {
  const childTotals = node.children.map(sumTotalCounts);
  node.totalCount = node.ownCount + childTotals.reduce((sum, count) => sum + count, 0);

  return node.totalCount;
}

function sortByName(nodes: CategoryNode[]): void {
  nodes.sort((first, second) =>
    first.name.localeCompare(second.name, undefined, { sensitivity: "base" }),
  );
  nodes.forEach((node) => sortByName(node.children));
}

/**
 * All folder paths of a tree, parents before children, e.g. for suggestions in a move field.
 *
 * @example flattenCategoryPaths(buildCategoryTree(["Haus/Terrasse"])) // ["Haus", "Haus/Terrasse"]
 */
export function flattenCategoryPaths(nodes: readonly CategoryNode[]): string[] {
  return nodes.flatMap((node) => [node.path, ...flattenCategoryPaths(node.children)]);
}
