import type { ConfigPath } from "@/types/editor";
import { asRecord, isRecord } from "@/utils/record";

const PATH_SEPARATOR = ".";
const INDEX_PATTERN = /^\d+$/;

type Raw = Record<string, unknown>;

/**
 * Turns a block id like "actions.2.then.0" into a path; digits become list indexes.
 *
 * @example parsePath("actions.2.then.0") // ["actions", 2, "then", 0]
 */
export function parsePath(id: string): ConfigPath {
  return id.split(PATH_SEPARATOR).map((part) => (INDEX_PATTERN.test(part) ? Number(part) : part));
}

export type SetAtPathOptions = {
  root: unknown;
  path: ConfigPath;
  value: unknown;
};

/**
 * Returns a copy of `root` with `value` at `path`; everything else stays as it was (same key
 * order, same untouched objects). `undefined` removes the key. Missing objects on the way are
 * created.
 *
 * HA allows a single item where a list is expected (`triggers: {…}`); index 0 then means that
 * item itself, so such configs keep their shape.
 *
 * @example
 * setAtPath({ root: { a: [{ b: 1 }] }, path: ["a", 0, "b"], value: 2 }) // { a: [{ b: 2 }] }
 */
export function setAtPath({ root, path, value }: SetAtPathOptions): unknown {
  if (path.length === 0) return value;

  const [head, ...rest] = path;

  if (typeof head === "number") {
    // A single item where HA allows one: index 0 is that item, any other index leaves it alone
    const isSingleItem = !Array.isArray(root);
    if (isSingleItem && head !== 0) return root;
    if (isSingleItem) return setAtPath({ root, path: rest, value });

    const copy: unknown[] = [...root];
    copy[head] = setAtPath({ root: copy[head], path: rest, value });
    return copy;
  }

  const record = asRecord(root);
  const next = setAtPath({ root: record[head as string], path: rest, value });
  const copy: Raw = { ...record };

  if (next === undefined) delete copy[head as string];
  else copy[head as string] = next;

  return copy;
}

export type GetAtPathOptions = {
  root: unknown;
  path: ConfigPath;
};

/** The value at `path`, with the same single-item rule as {@link setAtPath}. */
export function getAtPath({ root, path }: GetAtPathOptions): unknown {
  let current = root;

  for (const part of path) {
    if (typeof part === "number") {
      if (!Array.isArray(current)) {
        if (part !== 0) return undefined;
        continue;
      }
      current = (current as unknown[])[part];
    } else {
      current = isRecord(current) ? current[part] : undefined;
    }
  }

  return current;
}
