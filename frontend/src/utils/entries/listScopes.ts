import {
  ENTRY_KINDS,
  LIST_SCOPES,
  SCOPE_ALL,
  SCOPE_ENTITIES,
  type ListScope,
} from "@/constants/entries";
import type { EntryKind } from "@/types/entry";

const isKind = (scope: ListScope): boolean => (ENTRY_KINDS as readonly string[]).includes(scope);

export type ShowsKindOptions = {
  scopes: readonly ListScope[];
  kind: EntryKind;
};

/** Whether the chosen filters include entries of this kind; "Alle" means every entry. */
export function showsKind({ scopes, kind }: ShowsKindOptions): boolean {
  return scopes.includes(SCOPE_ALL) || scopes.includes(kind);
}

/** Plain entities only show when their own filter is chosen, so "Alle" stays usable in a big HA. */
export function showsEntities(scopes: readonly ListScope[]): boolean {
  return scopes.includes(SCOPE_ENTITIES);
}

export type ToggleScopeOptions = {
  scopes: readonly ListScope[];
  scope: ListScope;
};

/**
 * Adds or removes one filter (Strg/⌘+Klick, or the filter's menu). "Alle" and single kinds exclude
 * each other; when nothing is left, "Alle" is chosen.
 *
 * @example toggleScope({ scopes: ["automation"], scope: "entities" }) // ["automation", "entities"]
 * @example toggleScope({ scopes: ["all", "entities"], scope: "script" }) // ["entities", "script"]
 */
export function toggleScope({ scopes, scope }: ToggleScopeOptions): ListScope[] {
  // Remove a chosen filter
  if (scopes.includes(scope)) {
    const rest = scopes.filter((item) => item !== scope);
    return rest.length > 0 ? rest : [SCOPE_ALL];
  }

  // Add one: "Alle" replaces single kinds, a single kind replaces "Alle"
  const rest = scopes.filter((item) => {
    if (scope === SCOPE_ALL) return !isKind(item);
    if (isKind(scope)) return item !== SCOPE_ALL;
    return true;
  });

  return [...rest, scope];
}

/** Filters kept in the browser may come from an older version: only known ones, never none. */
export function validScopes(value: unknown): ListScope[] {
  const known = Array.isArray(value)
    ? LIST_SCOPES.filter((scope) => (value as unknown[]).includes(scope))
    : [];

  return known.length > 0 ? known : [SCOPE_ALL];
}
