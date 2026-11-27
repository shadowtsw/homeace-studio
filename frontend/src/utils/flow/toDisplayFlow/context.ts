import type {
  AddTarget,
  BlockChip,
  BlockSection,
  DisplayBlock,
  EditorCatalog,
} from "@/types/editor";
import { asList } from "@/utils/list";

import { parsePath } from "../configPath";
import type { FormatTexts } from "../formatValue";

/** Texts the converter needs; filled from the locale files by the caller. */
export type FlowTexts = FormatTexts & {
  /** Titles of hand-made blocks by kind, plus "unknown". */
  titles: Record<string, string>;
  /** Labels of classic fields and branches ("to", "for", "then", "else", …). */
  labels: Record<string, string>;
  /** Labels of fixed choices like "sunset" or "mon". */
  choices: Record<string, string>;
  /** Title of the entity editor, e.g. "Entität". */
  entity: string;
};

/** Names for target IDs that are neither entities nor areas; IDs without a name show as they are. */
export type TargetNames = {
  floors: Record<string, string>;
  labels: Record<string, string>;
};

export type Raw = Record<string, unknown>;

export type Context = {
  catalog: EditorCatalog | null;
  names: Record<string, string>;
  targetNames: TargetNames;
  texts: FlowTexts;
};

/** One list of blocks in the config: its value and where it sits (`id` style, "actions.2.then"). */
export type BlockListOptions = {
  value: unknown;
  path: string;
  context: Context;
};

/** One block: its config and its id, which is its place in the config ("actions.2"). */
export type BlockOptions = {
  raw: Raw;
  id: string;
  context: Context;
};

const PATH_SEPARATOR = ".";

export const KEY_SEPARATOR = ".";

export const asText = (value: unknown): string | undefined =>
  typeof value === "string" ? value : undefined;
/** For blocks whose single value needs no name, like the duration of "Warten". */
export const unlabeled = (chips: BlockChip[]): BlockChip[] =>
  chips.map((chip) => ({ ...chip, label: undefined }));
/** Appends one level to a block id: `join("actions", 2)` → "actions.2". */
export const join = (path: string, part: string | number): string =>
  `${path}${PATH_SEPARATOR}${part}`;

export type KeyInOptions = {
  raw: Raw;
  keys: string[];
};

/** The first of these keys the config uses; the first one when none is set. */
export const keyIn = ({ raw, keys }: KeyInOptions): string =>
  keys.find((key) => key in raw) ?? keys[0] ?? "";

export type AddTargetOptions = {
  section: BlockSection;
  path: string;
};

export const addTarget = ({ section, path }: AddTargetOptions): AddTarget => ({
  section,
  listPath: parsePath(path),
});

export type ListBlocksOptions = {
  value: unknown;
  path: string;
  /** Builds the block of one list item; `id` is the item's place in the config. */
  build: (item: { raw: unknown; id: string }) => DisplayBlock;
};

/**
 * Builds the blocks of one list and tells each where it sits, for moving, duplicating and
 * deleting. HA allows a single item instead of a list; it counts as a list of one.
 */
export function listBlocks({ value, path, build }: ListBlocksOptions): DisplayBlock[] {
  const items = asList(value);
  const listPath = parsePath(path);

  return items.map((raw, index) => {
    const block = build({ raw, id: join(path, index) });
    block.position = { listPath, index, count: items.length };
    return block;
  });
}

export type BaseBlockOptions = {
  section: BlockSection;
  icon: string;
  title: string;
  id: string;
  raw: Raw;
};

export function baseBlock({ section, icon, title, id, raw }: BaseBlockOptions): DisplayBlock {
  return {
    id,
    section,
    icon,
    title,
    chips: [],
    branches: [],
    // Set by listBlocks; every block comes from a list.
    position: { listPath: [], index: 0, count: 1 },
    isDisabled: raw.enabled === false,
    addable: [],
    isUnknown: false,
    raw,
  };
}
