import type {
  AddTarget,
  BlockChip,
  BlockSection,
  DisplayBlock,
  EditorCatalog,
} from "@/types/editor";

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

const PATH_SEPARATOR = ".";

export const KEY_SEPARATOR = ".";

export const asList = (value: unknown): unknown[] =>
  value === undefined || value === null ? [] : Array.isArray(value) ? value : [value];
export const asRecord = (value: unknown): Raw =>
  value && typeof value === "object" && !Array.isArray(value) ? (value as Raw) : {};
export const asText = (value: unknown): string | undefined =>
  typeof value === "string" ? value : undefined;
/** For blocks whose single value needs no name, like the duration of "Warten". */
export const unlabeled = (chips: BlockChip[]): BlockChip[] =>
  chips.map((chip) => ({ ...chip, label: undefined }));
export const join = (path: string, part: string | number): string =>
  `${path}${PATH_SEPARATOR}${part}`;
/** The first of these keys the config uses; the first one when none is set. */
export const keyIn = (raw: Raw, keys: string[]): string =>
  keys.find((key) => key in raw) ?? keys[0] ?? "";

export const addTarget = (section: BlockSection, path: string): AddTarget => ({
  section,
  listPath: parsePath(path),
});

/**
 * Builds the blocks of one list and tells each where it sits, for moving, duplicating and
 * deleting. HA allows a single item instead of a list; it counts as a list of one.
 */
export function listBlocks(
  value: unknown,
  path: string,
  build: (raw: unknown, id: string) => DisplayBlock,
): DisplayBlock[] {
  const items = asList(value);
  const listPath = parsePath(path);

  return items.map((raw, index) => {
    const block = build(raw, join(path, index));
    block.position = { listPath, index, count: items.length };
    return block;
  });
}

export function baseBlock(
  section: BlockSection,
  icon: string,
  title: string,
  id: string,
  raw: Raw,
): DisplayBlock {
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
