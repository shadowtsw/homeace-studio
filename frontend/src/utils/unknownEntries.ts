import type { EntityOption } from "@/types/editor";
import type { Entry } from "@/types/entry";

type UnknownEntryOptions = {
  entries: readonly Pick<Entry, "entityId" | "isDisabled">[];
  entities: readonly Pick<EntityOption, "entityId">[];
};

/**
 * Whether the list has an entry the entity list does not know yet (created after it was loaded).
 * Disabled entries have no state in HA and are never in the entity list, so they do not count.
 */
export function hasUnknownEntry(options: UnknownEntryOptions): boolean {
  const known = new Set(options.entities.map((entity) => entity.entityId));

  return options.entries.some((entry) => !entry.isDisabled && !known.has(entry.entityId));
}
