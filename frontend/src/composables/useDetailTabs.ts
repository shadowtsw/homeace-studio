import { computed, ref, watch, type Ref } from "vue";

import { DETAIL_TAB, type DetailTab } from "@/constants/entries";
import { useDependenciesStore } from "@/stores/dependenciesStore";
import { useTracesStore } from "@/stores/tracesStore";
import type { Entry } from "@/types/entry";
import { startTab } from "@/utils/entries/detailTab";

/** Kinds that have a flow (triggers, conditions, actions) to show. */
const FLOW_KINDS = ["automation", "script"];

/**
 * The tabs of the open entry: which ones it has, the active one, and the count on the dependencies
 * tab. A newly opened entry starts on the tab the user picked last if it has it, else on its first
 * tab (its flow, a helper's settings or a scene's states).
 */
export function useDetailTabs({ entry }: { entry: Ref<Entry | null> }) {
  const deps = useDependenciesStore();
  const traces = useTracesStore();

  const hasFlow = computed(() => FLOW_KINDS.includes(entry.value?.kind ?? ""));
  const isHelper = computed(() => entry.value?.kind === "helper");
  const tabs = computed((): DetailTab[] => {
    if (hasFlow.value) {
      return [DETAIL_TAB.flow, DETAIL_TAB.properties, DETAIL_TAB.history, DETAIL_TAB.dependencies];
    }
    if (isHelper.value) {
      return [DETAIL_TAB.settings, DETAIL_TAB.properties, DETAIL_TAB.dependencies];
    }
    if (entry.value?.kind === "scene") {
      return [DETAIL_TAB.states, DETAIL_TAB.properties, DETAIL_TAB.dependencies];
    }
    return [DETAIL_TAB.properties, DETAIL_TAB.dependencies];
  });
  const activeTab = ref<DetailTab>(DETAIL_TAB.flow);
  /**
   * The tab the user picked last. It stays when the next entry lacks it, so clicking from an
   * automation's history over a helper to the next automation lands on the history again.
   */
  const pickedTab = ref<DetailTab | null>(null);

  function selectTab(tab: DetailTab): void {
    activeTab.value = tab;
    pickedTab.value = tab;
  }

  // A newly opened entry starts on its tab, shows no run on its flow, and its dependencies load.
  watch(
    () => entry.value?.entityId,
    (entityId) => {
      activeTab.value =
        startTab({ tabs: tabs.value, preferred: pickedTab.value }) ?? DETAIL_TAB.properties;
      traces.showOnFlow(null);
      void deps.load(entityId ?? null);
    },
    { immediate: true },
  );

  /** "Im Ablauf zeigen" from the history: the flow tab, with the run on its blocks. */
  function showRunOnFlow(runId: string): void {
    traces.showOnFlow(runId);
    selectTab(DETAIL_TAB.flow);
  }

  /** Uses and users together, for the tab badge. */
  const dependencyCount = computed(() => {
    const current = deps.current;
    if (!current || current.entityId !== entry.value?.entityId) return 0;
    return current.uses.length + current.usedBy.length;
  });

  return { hasFlow, tabs, activeTab, selectTab, showRunOnFlow, dependencyCount };
}
