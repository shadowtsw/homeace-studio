/** The part after the dot: lowercase letters, digits and _. */
export const OBJECT_ID_PATTERN = /^[a-z0-9_]+$/;

/** "light" of "light.terrace". */
export function domainOf(entityId: string): string {
  return entityId.slice(0, entityId.indexOf("."));
}

/** "terrace" of "light.terrace". */
export function objectIdOf(entityId: string): string {
  return entityId.slice(entityId.indexOf(".") + 1);
}

/**
 * A name as HA turns it into an object id: accents dropped ("ä" → "a"), "ß" → "ss", everything
 * else that is not a letter or digit becomes "_".
 *
 * @example slugifyName("Gäste kommen!") // "gaste_kommen"
 */
export function slugifyName(name: string): string {
  return name
    .replace(/ß/g, "ss")
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

/**
 * The entity ID that would match the name, when the current one does not.
 *
 * @returns null when the ID already fits or the name gives no usable ID.
 */
export function suggestEntityId(entityId: string, name: string): string | null {
  const slug = slugifyName(name);
  if (!slug || slug === objectIdOf(entityId)) return null;

  return `${domainOf(entityId)}.${slug}`;
}
