import { ENTRY_KINDS, SCOPE_ALL, SCOPE_ENTITIES, type ListScope } from "@/constants/entries";

/** Whether the chosen filters hide entries, i.e. "Alle" is not among them. */
export function isListNarrowed(scopes: readonly ListScope[]): boolean {
  return !scopes.includes(SCOPE_ALL);
}

/** Why a list shows nothing. */
export type EmptyListReason =
  /**
   * The chosen filters hide what is here. Entries of other kinds come first, because "Alle zeigen"
   * brings them back; hidden entities only count when no entry is hidden ("Entitäten zeigen").
   */
  | { kind: "filtered"; hides: "entries" | "entities"; count: number }
  /** A real folder with nothing in it, whatever the filter. */
  | { kind: "emptyFolder" }
  /** Nothing to show anywhere, e.g. a search without hits. */
  | { kind: "nothing" };

/**
 * Says why the list is empty: the filters hide something here, the folder really is empty, or there
 * is nothing at all. Only for a list that shows nothing.
 *
 * @param options.counts - What each filter would show here (folder and search), as on the filter tabs.
 * @example emptyListReason({ scopes: ["scene"], counts, isRealCategory: true, isSearching: false })
 *   // { kind: "filtered", hides: "entries", count: 35 } when the folder holds 35 other entries
 */
export function emptyListReason({
  scopes,
  counts,
  isRealCategory,
  isSearching,
}: {
  scopes: readonly ListScope[];
  counts: Record<ListScope, number>;
  isRealCategory: boolean;
  isSearching: boolean;
}): EmptyListReason {
  const shownEntries = scopes.includes(SCOPE_ALL)
    ? counts[SCOPE_ALL]
    : ENTRY_KINDS.filter((kind) => scopes.includes(kind)).reduce(
        (sum, kind) => sum + counts[kind],
        0,
      );
  const hiddenEntries = Math.max(0, counts[SCOPE_ALL] - shownEntries);
  const hiddenEntities = scopes.includes(SCOPE_ENTITIES) ? 0 : counts[SCOPE_ENTITIES];

  if (hiddenEntries > 0) return { kind: "filtered", hides: "entries", count: hiddenEntries };
  if (hiddenEntities > 0) return { kind: "filtered", hides: "entities", count: hiddenEntities };

  return isRealCategory && !isSearching ? { kind: "emptyFolder" } : { kind: "nothing" };
}
