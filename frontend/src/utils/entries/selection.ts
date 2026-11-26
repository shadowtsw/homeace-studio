/**
 * The IDs from `anchor` to `target` in list order, both included, for shift-click.
 * Falls back to just `target` when the anchor is not in the list (anymore).
 *
 * @example rangeBetween(["a", "b", "c", "d"], "d", "b") // ["b", "c", "d"]
 */
export function rangeBetween(
  order: readonly string[],
  anchor: string | null,
  target: string,
): string[] {
  const from = anchor === null ? -1 : order.indexOf(anchor);
  const to = order.indexOf(target);

  if (from === -1 || to === -1) return [target];

  return order.slice(Math.min(from, to), Math.max(from, to) + 1);
}
