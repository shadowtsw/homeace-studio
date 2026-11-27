import { computed, watch, type ComputedRef } from "vue";

import { useFlowTexts } from "@/composables/texts/useFlowTexts";
import { useCheckupStore } from "@/stores/checkupStore";
import { useEditorStore } from "@/stores/editorStore";
import { useLookupsStore } from "@/stores/lookupsStore";
import { useSettingsStore } from "@/stores/settingsStore";
import type { Entry } from "@/types/entry";
import { markGoneChips } from "@/utils/flow/markGoneChips";
import { toDisplayFlow } from "@/utils/flow/toDisplayFlow";

/** Kinds whose flow the detail view shows. */
const FLOW_KINDS = ["automation", "script"];

/**
 * The flow of the open automation or script as the detail shows it. Opening the entry loads the
 * flow; the block catalog follows the UI language. Entities, areas, floors and labels show by name,
 * and entities the check-up found missing are marked.
 */
export function useDisplayFlow({ entry }: { entry: ComputedRef<Entry | null> }) {
  const editorStore = useEditorStore();
  const settings = useSettingsStore();
  const lookups = useLookupsStore();
  const checkup = useCheckupStore();
  const flowTexts = useFlowTexts();

  // Opening an automation or script loads its flow; anything else clears it.
  watch(
    () => entry.value?.entityId,
    (entityId) => {
      const current = entry.value;

      if (entityId && current && FLOW_KINDS.includes(current.kind)) {
        void editorStore.loadFlow(entityId);
      } else {
        editorStore.clearFlow();
      }
    },
    { immediate: true },
  );

  // Block names come from HA in the UI language.
  watch(
    () => settings.locale,
    (language) => void editorStore.loadCatalog(language),
    { immediate: true },
  );

  /** Block types in the UI language; null until HA sent them. */
  const catalog = computed(() => editorStore.catalogs[settings.locale] ?? null);

  const displayFlow = computed(() => {
    const flow = editorStore.editedFlow;

    if (!flow || flow.entityId !== entry.value?.entityId) return null;

    // Entities picked in the editor are not in the flow's own name list yet; areas show by name.
    const areaNames = Object.fromEntries(lookups.areas.map((area) => [area.areaId, area.name]));
    const entityNames = { ...areaNames, ...lookups.entityNames, ...flow.entityNames };

    const targetNames = {
      floors: Object.fromEntries(lookups.floors.map((floor) => [floor.floorId, floor.name])),
      labels: Object.fromEntries(lookups.labels.map((label) => [label.labelId, label.name])),
    };

    const display = toDisplayFlow({
      flow: { ...flow, entityNames },
      catalog: catalog.value,
      texts: flowTexts.value,
      targetNames,
    });
    // Entities the check-up found missing show in red.
    const gone = new Set(
      checkup
        .findingsFor(flow.entityId)
        .filter((finding) => finding.kind === "gone")
        .flatMap((finding) => finding.refs.map((ref) => ref.entityId)),
    );

    return display ? markGoneChips({ flow: display, gone }) : display;
  });

  return { displayFlow, catalog };
}
