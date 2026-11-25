import { useDocumentVisibility, useEventSource } from "@vueuse/core";
import { computed, watch, type ComputedRef } from "vue";

import { useAiStore } from "@/stores/aiStore";
import { useEditorStore } from "@/stores/editorStore";
import { useEntriesStore } from "@/stores/entriesStore";
import { useFoldersStore } from "@/stores/foldersStore";
import { useLookupsStore } from "@/stores/lookupsStore";
import { useStudioStore } from "@/stores/studioStore";

/** Relative, like every API call, so it also works behind HA ingress. */
const EVENTS_URL = "api/events";
const VISIBLE = "visible";

/**
 * Keeps the studio in step with HA: the backend sends a message after relevant changes
 * (GET /api/events), and the entries reload quietly. The browser reconnects the stream on its own;
 * when the tab becomes visible again, it reloads once in case events were missed meanwhile.
 *
 * @returns Whether the live connection is open, for a status hint in the UI.
 */
export function useLiveUpdates(): { isLive: ComputedRef<boolean> } {
  const entriesStore = useEntriesStore();
  const foldersStore = useFoldersStore();
  const editorStore = useEditorStore();
  const ai = useAiStore();
  const lookups = useLookupsStore();
  const studio = useStudioStore();
  const { data, status } = useEventSource(EVENTS_URL, [], { autoReconnect: true });
  const visibility = useDocumentVisibility();

  // Every default message means "something changed"; the heartbeat comes as its own event type
  // and does not touch `data`.
  watch(data, () => {
    void entriesStore.refresh();
    void editorStore.refreshFlow();
    // Plain entities only while they are shown; reading every state is not free in a big HA.
    if (studio.isShowingEntities) void lookups.loadEntities(true);
    // New folder plans from an AI arrive the same way.
    void ai.loadPlans();
  });

  watch(visibility, (current) => {
    if (current !== VISIBLE) return;

    void entriesStore.refresh();
    void foldersStore.load();
    void ai.loadPlans();
  });

  return { isLive: computed(() => status.value === "OPEN") };
}
