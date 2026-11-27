import { useEventListener } from "@vueuse/core";
import type { ComputedRef } from "vue";

import { useStudioStore } from "@/stores/studioStore";
import type { Entry } from "@/types/entry";

/** Fields where F2 belongs to the typing, not to renaming. */
const TYPING_TARGETS = ["INPUT", "TEXTAREA", "SELECT"];

type UseStudioWindowEventsOptions = {
  /** The open entry; F2 renames it. */
  entry: ComputedRef<Entry | null>;
  /** Entries with unsaved edits: flows, helper settings and scenes. */
  unsavedIds: ComputedRef<Set<string>>;
};

/**
 * Window-wide behaviour of the studio page: F2 renames the open entry, and the browser asks before
 * unsaved edits are lost.
 */
export function useStudioWindowEvents({ entry, unsavedIds }: UseStudioWindowEventsOptions): void {
  const studio = useStudioStore();

  // Unsaved edits live only in this tab; the browser asks before they are lost.
  useEventListener(window, "beforeunload", (event: BeforeUnloadEvent) => {
    if (unsavedIds.value.size > 0) event.preventDefault();
  });

  // F2 renames the open entry: in its list row when it is visible, else in the title.
  useEventListener(window, "keydown", (event: KeyboardEvent) => {
    const target = event.target as HTMLElement | null;
    if (event.key !== "F2" || TYPING_TARGETS.includes(target?.tagName ?? "")) return;

    const current = entry.value;
    if (!current?.isInRegistry) return;

    event.preventDefault();
    const row = document.querySelector(`[data-entity-id="${CSS.escape(current.entityId)}"]`);
    studio.startRename({ entityId: current.entityId, place: row ? "list" : "title" });
  });
}
