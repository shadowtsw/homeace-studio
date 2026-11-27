import { onMounted, watch } from "vue";

import { useAiStore } from "@/stores/aiStore";
import { useCheckupStore } from "@/stores/checkupStore";
import { useCleanupStore } from "@/stores/cleanupStore";
import { useDependenciesStore } from "@/stores/dependenciesStore";
import { useEntriesStore } from "@/stores/entriesStore";
import { useEntryAreasStore } from "@/stores/entryAreasStore";
import { useFoldersStore } from "@/stores/foldersStore";
import { useLookupsStore } from "@/stores/lookupsStore";
import { useTracesStore } from "@/stores/tracesStore";

/**
 * Loads what the studio page shows once it is mounted, and reloads what is derived from the
 * entries (proposals, check-up, dependencies, runs, areas) whenever the entries change.
 */
export function useStudioLoading(): void {
  const entriesStore = useEntriesStore();
  const foldersStore = useFoldersStore();
  const lookups = useLookupsStore();
  const ai = useAiStore();
  const cleanup = useCleanupStore();
  const checkup = useCheckupStore();
  const dependencies = useDependenciesStore();
  const traces = useTracesStore();
  const entryAreas = useEntryAreasStore();

  // Proposals follow the categories: after moves, renames and live updates from HA.
  watch(
    () => entriesStore.entries,
    () => {
      void cleanup.load();
      void checkup.load();
      void dependencies.refresh();
      void traces.refresh();
      void entryAreas.load();
    },
  );

  onMounted(() => {
    void entriesStore.load();
    void foldersStore.load();
    void lookups.load();
    // Plain entities: counts on the filter and their folders in the tree
    void lookups.loadEntities();
    void ai.loadPlans();
  });
}
