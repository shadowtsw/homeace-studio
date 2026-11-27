/**
 * True for a plain object: not null, not an array. Narrows unknown data (HA configs, JSON) without
 * a cast.
 *
 * @example isRecord({ state: "on" }) // true
 * @example isRecord(["on"]) // false
 */
export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/**
 * The value as an object to read keys from; anything that is no plain object gives an empty one.
 *
 * @returns The object itself (not a copy) or `{}`.
 * @example asRecord({ entity_id: "light.kitchen" }).entity_id // "light.kitchen"
 * @example asRecord("on").entity_id // undefined
 */
export function asRecord(value: unknown): Record<string, unknown> {
  return isRecord(value) ? value : {};
}
