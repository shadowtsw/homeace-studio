import type { VersionRef } from "../versions.model";

/** The configs in HA that versions are kept of. */
export interface VersionTargetRepository {
  /** Kind and storage key of an entry, or null when it keeps no versions (other kinds, YAML-only). */
  resolveRef(entityId: string): Promise<VersionRef | null>;
  /** Every automation, script and scene HA knows, with its storage key. */
  listRefs(): Promise<VersionRef[]>;
  /** The config as HA stores it, or null when it is not stored where HomeAce Studio can write. */
  loadStoredConfig(ref: VersionRef): Promise<Record<string, unknown> | null>;
  /**
   * The entity ID HA gave an entry after it was written again (from the trash); asks a few times,
   * because HA registers it only after its reload. Null when it did not show up.
   */
  waitForEntityId(ref: Pick<VersionRef, "kind" | "key">): Promise<string | null>;
  /** Writes a whole config back; HA validates it and reloads on its own. */
  saveStoredConfig(options: { ref: VersionRef; config: Record<string, unknown> }): Promise<void>;
}
