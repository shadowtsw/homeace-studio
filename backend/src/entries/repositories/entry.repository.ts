import type { Entry, EntryChanges, EntryDetails } from "../entry.model";

export type UpdateEntryOptions = {
  entityId: string;
  changes: EntryChanges;
};

export type CallServiceOptions = {
  domain: string;
  service: string;
  entityId: string;
};

export interface EntryRepository {
  findAll(): Promise<Entry[]>;
  findOne(entityId: string): Promise<Entry | null>;
  /** Writes name, icon, area and labels to HA's entity registry; missing fields stay. */
  update(options: UpdateEntryOptions): Promise<void>;
  /** Fields only `entity_registry/get` has (aliases); null when HA has no registry entry for it. */
  findDetails(entityId: string): Promise<EntryDetails | null>;
  /** Calls an HA service for one entity, e.g. `automation.turn_off`. */
  callService(options: CallServiceOptions): Promise<void>;
}
