import { defineStore } from "pinia";
import { computed, ref, watch } from "vue";

import { fetchEntities } from "@/services/editorService";
import { fetchAreas, fetchFloors, fetchLabels } from "@/services/lookupsService";
import type { EntityOption } from "@/types/editor";
import type { Area, Floor, Label } from "@/types/entry";
import { hasUnknownEntry } from "@/utils/unknownEntries";

import { useEntriesStore } from "./entriesStore";

/** Areas, floors, labels and all entities from HA, for the pickers in the detail view and the editor. */
export const useLookupsStore = defineStore("lookups", () => {
  const areas = ref<Area[]>([]);
  const floors = ref<Floor[]>([]);
  const labels = ref<Label[]>([]);
  const entities = ref<EntityOption[]>([]);

  /** Entity ID → friendly name, so newly picked entities show their name right away. */
  const entityNames = computed(() =>
    Object.fromEntries(entities.value.map((entity) => [entity.entityId, entity.name])),
  );

  async function load(): Promise<void> {
    try {
      [areas.value, floors.value, labels.value] = await Promise.all([
        fetchAreas(),
        fetchFloors(),
        fetchLabels(),
      ]);
    } catch (error) {
      // The detail still shows the names that come with each entry.
      console.error("Loading areas, floors and labels failed", error);
    }
  }

  /** The load that is running, so overlapping reloads wait for it instead of racing it. */
  let running: Promise<void> | null = null;
  /** Fresh data was asked for while a load was running: load once more after it. */
  let isOutdated = false;

  /**
   * Loads the entity list once, when the first entity picker opens; `isFresh` reads it again, for
   * views that show states right now (dependencies) and after live updates. At most one load runs;
   * fresh reloads asked for meanwhile become a single one after it, so an older answer never
   * overwrites a newer one and a busy HA does not pile up requests.
   */
  async function loadEntities(isFresh = false): Promise<void> {
    if (entities.value.length > 0 && !isFresh) return;
    if (running) {
      if (isFresh) isOutdated = true;
      return running;
    }

    running = (async () => {
      do {
        isOutdated = false;
        try {
          entities.value = await fetchEntities();
        } catch (error) {
          console.error("Loading the entities failed", error);
        }
      } while (isOutdated);
    })().finally(() => {
      running = null;
    });
    return running;
  }

  // A helper or script created after the entity list was loaded must be known too, or dragging it
  // into a flow finds nothing and the drop is refused. Reload once the list shows an unknown one.
  const entriesStore = useEntriesStore();
  watch(
    () => entriesStore.entries,
    (entries) => {
      const isLoaded = entities.value.length > 0;
      if (isLoaded && hasUnknownEntry({ entries, entities: entities.value })) {
        void loadEntities(true);
      }
    },
  );

  return { areas, floors, labels, entities, entityNames, load, loadEntities };
});
