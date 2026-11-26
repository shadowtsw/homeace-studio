/** A full entity ID: domain, dot, object id. */
export const ENTITY_ID_PATTERN = /^[a-z0-9_]+\.[a-z0-9_]+$/;

/**
 * Keys whose value names a service, not an entity: `action: script.good_night` calls the script by
 * its key in scripts.yaml, which stays the same when the entity ID changes. Rewriting it would break
 * the call.
 */
const SERVICE_KEYS = new Set(["action", "service"]);

/** The whole ID only: "light.terrace" must not hit "light.terrace_paths" or "xlight.terrace". */
function idPattern(entityId: string): RegExp {
  const escaped = entityId.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`(?<![a-z0-9_.])${escaped}(?![a-z0-9_])`, "g");
}

export type CountEntityIdOptions = {
  value: unknown;
  entityId: string;
  key?: string;
};

/**
 * How often an entity ID appears in a config: entity fields, targets, lists and templates alike,
 * service names left out.
 */
export function countEntityId({ value, entityId, key }: CountEntityIdOptions): number {
  if (typeof value === "string") {
    return key !== undefined && SERVICE_KEYS.has(key)
      ? 0
      : (value.match(idPattern(entityId)) ?? []).length;
  }
  if (Array.isArray(value)) {
    return (value as unknown[]).reduce<number>(
      (sum, item) => sum + countEntityId({ value: item, entityId, key }),
      0,
    );
  }
  if (value && typeof value === "object") {
    return Object.entries(value).reduce(
      (sum: number, [childKey, child]) =>
        sum + countEntityId({ value: child, entityId, key: childKey }),
      0,
    );
  }
  return 0;
}

export type ReplaceEntityIdOptions = {
  value: unknown;
  from: string;
  to: string;
  key?: string;
};

/**
 * A copy of a config with every occurrence of an entity ID replaced (see {@link countEntityId});
 * everything else stays as it is.
 */
export function replaceEntityId({ value, from, to, key }: ReplaceEntityIdOptions): unknown {
  if (typeof value === "string") {
    return key !== undefined && SERVICE_KEYS.has(key) ? value : value.replace(idPattern(from), to);
  }
  if (Array.isArray(value))
    return value.map((item) => replaceEntityId({ value: item, from, to, key }));
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([childKey, child]) => [
        childKey,
        replaceEntityId({ value: child, from, to, key: childKey }),
      ]),
    );
  }
  return value;
}
