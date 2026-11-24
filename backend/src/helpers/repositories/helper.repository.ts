import type { HelperType } from "../helpers.constants";

export type HelperRegistration = {
  /** The integration that owns the entity, e.g. "input_boolean" or "template". */
  platform: string;
  /** For storage helpers: their storage id. */
  uniqueId: string;
  /** The entity's category in the "helpers" scope, if any. */
  categoryId: string | null;
};

export interface HelperRepository {
  /**
   * Creates the helper in HA.
   *
   * @returns HA's storage id of the new helper (also the unique_id of its entity).
   */
  create(type: HelperType, payload: Record<string, unknown>): Promise<string>;

  /** The entity ID of a helper, or null while HA has not registered its entity yet. */
  findEntityId(type: HelperType, helperId: string): Promise<string | null>;

  /** Registry facts about an entity, or null when HA's registry does not know it. */
  findRegistration(entityId: string): Promise<HelperRegistration | null>;

  /** The stored helper as `<type>/list` has it (with its settings), or null if HA has none. */
  findStored(type: HelperType, helperId: string): Promise<Record<string, unknown> | null>;

  /** Replaces a stored helper via `<type>/update`; the payload must carry all its fields. */
  update(type: HelperType, helperId: string, payload: Record<string, unknown>): Promise<void>;

  /** Deletes a helper of one of the storage types via `<type>/delete`. */
  remove(type: HelperType, helperId: string): Promise<void>;
}
