export type ToggleItemOptions<T> = {
  items: readonly T[];
  item: T;
};

/**
 * Takes `item` out of the list when it is in it, otherwise adds it at the end.
 * Returns a new array; the given one stays as it is. Compares with `===`, so it is meant for IDs
 * and plain values, not objects.
 *
 * @example toggleItem({ items: ["a", "b"], item: "a" }) // ["b"]
 * @example toggleItem({ items: ["b"], item: "a" }) // ["b", "a"]
 */
export function toggleItem<T>({ items, item }: ToggleItemOptions<T>): T[] {
  if (items.includes(item)) return items.filter((other) => other !== item);

  return [...items, item];
}

/**
 * HA allows a single item or nothing where a list is expected; this always gives a list.
 *
 * @param value - Anything from a config; `undefined` and `null` mean "nothing".
 * @returns The list itself (not a copy), the single value in a list, or an empty list.
 * @example asList("light.kitchen") // ["light.kitchen"]
 * @example asList(null) // []
 */
export function asList(value: unknown): unknown[] {
  if (value === undefined || value === null) return [];

  return Array.isArray(value) ? value : [value];
}
