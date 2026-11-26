/**
 * The tab a newly opened entry starts on: the last tab the user picked, if this entry has it,
 * else its first tab. This lets people click through the list and compare the same tab.
 */
export function startTab<T extends string>(tabs: readonly T[], preferred: T | null): T | null {
  if (preferred && tabs.includes(preferred)) return preferred;
  return tabs[0] ?? null;
}
