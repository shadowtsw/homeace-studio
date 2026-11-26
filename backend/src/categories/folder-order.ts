/**
 * Own order of folders per parent path ("" for the top level); only in HomeAce Studio, HA keeps its
 * categories alphabetical.
 */
export type FolderOrder = Record<string, string[]>;

export type MoveFolderOrderOptions = {
  order: FolderOrder;
  movePath: (path: string) => string;
};

/** The order after folders moved (rename, clean-up): parents and children follow the new paths. */
export function moveFolderOrder({ order, movePath }: MoveFolderOrderOptions): FolderOrder {
  return Object.fromEntries(
    Object.entries(order).map(([parent, children]) => [
      parent === "" ? "" : movePath(parent),
      [...new Set(children.map(movePath))],
    ]),
  );
}

/** The parent path of a folder: "Haus/Terrasse" → "Haus", "Haus" → "". */
export function parentOf(path: string): string {
  const index = path.lastIndexOf("/");
  return index < 0 ? "" : path.slice(0, index);
}
