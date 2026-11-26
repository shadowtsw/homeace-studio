import type { HaCategory, HaFloor, HaLabel } from "../../ha/ha.types";

/** What the tool reads from HA besides the shared snapshot. */
export interface SortingSourcesRepository {
  floors(): Promise<HaFloor[]>;
  labels(): Promise<HaLabel[]>;
  /** Categories of HomeAce Studio's own scope for plain entities. */
  entityCategories(): Promise<HaCategory[]>;
  /** Integration domain → name; empty when HA does not hand them out. */
  integrationNames(): Promise<Record<string, string>>;
}
