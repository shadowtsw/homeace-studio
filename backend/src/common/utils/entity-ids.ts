/** `domain.object_id`, lowercase, as HA writes entity IDs. */
const ENTITY_ID = /^[a-z_]+\.[a-z0-9_]+$/;

/** HA allows a list or comma-separated text in an `entity_id` field. */
function itemsOf(value: unknown): unknown[] {
  if (Array.isArray(value)) return value;
  if (typeof value === "string") return value.split(",");
  return [];
}

/**
 * The entity IDs in an `entity_id` field of a flow config: a list or comma-separated text. Spaces
 * around an ID are ignored; anything that is no valid entity ID (templates, numbers, …) is skipped.
 *
 * @example entityIdsIn("light.a, light.b") // ["light.a", "light.b"]
 * @example entityIdsIn(["light.a", "{{ x }}", 3]) // ["light.a"]
 */
export function entityIdsIn(value: unknown): string[] {
  const texts = itemsOf(value).filter((item): item is string => typeof item === "string");

  return texts.map((text) => text.trim()).filter((id) => ENTITY_ID.test(id));
}
