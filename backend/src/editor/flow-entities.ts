/** Looks like an entity ID: "domain.object_id". */
const ENTITY_ID_PATTERN = /^[a-z0-9_]+\.[a-z0-9_]+$/;

export type CollectEntityIdsOptions = {
  /** Any HA config value (object, array, string). */
  config: unknown;
  /** All entity IDs HA has right now. */
  knownEntityIds: ReadonlySet<string>;
};

/**
 * Finds every entity a config mentions, wherever it is (target, entity_id, options like `zone`,
 * nested actions). A string only counts when HA knows such an entity, so service names like
 * "light.turn_on" are not mistaken for entities.
 *
 * @returns The mentioned entity IDs, each once.
 */
export function collectEntityIds({ config, knownEntityIds }: CollectEntityIdsOptions): string[] {
  const found = new Set<string>();
  const visit = (value: unknown): void => {
    if (typeof value === "string") {
      if (ENTITY_ID_PATTERN.test(value) && knownEntityIds.has(value)) found.add(value);
      return;
    }

    if (Array.isArray(value)) {
      value.forEach(visit);
      return;
    }

    if (value && typeof value === "object") {
      Object.values(value).forEach(visit);
    }
  };

  visit(config);

  return [...found];
}
