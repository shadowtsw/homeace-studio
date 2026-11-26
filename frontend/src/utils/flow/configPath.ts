import type { ConfigPath } from "@/types/editor";

const PATH_SEPARATOR = ".";
const INDEX_PATTERN = /^\d+$/;

type Raw = Record<string, unknown>;

const isRecord = (value: unknown): value is Raw =>
  typeof value === "object" && value !== null && !Array.isArray(value);

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
    if (!Array.isArray(root)) return head === 0 ? setAtPath({ root, path: rest, value }) : root;

    const copy = [...(root as unknown[])];
    copy[head] = setAtPath({ root: copy[head], path: rest, value });
    return copy;
  }

  const record = isRecord(root) ? root : {};
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
