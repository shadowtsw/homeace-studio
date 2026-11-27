import { useEventListener } from "@vueuse/core";
import { nextTick, type Ref } from "vue";

import type { Entry } from "@/types/entry";

/** Fields where the arrow keys belong to the typing, not to the list. */
const TYPING_TARGETS = ["INPUT", "TEXTAREA", "SELECT"];

type UseListArrowKeysOptions = {
  /** The entries of the open groups, in the order they are shown. */
  entries: Ref<Entry[]>;
  selectedEntityId: Ref<string | null>;
  /** Opens the entry the keys moved to. */
  select: (entityId: string) => void;
};

/** Up and down walk through the open rows (and open the entry), like in a file manager. */
export function useListArrowKeys({
  entries,
  selectedEntityId,
  select,
}: UseListArrowKeysOptions): void {
  useEventListener(window, "keydown", (event: KeyboardEvent) => {
    if (event.key !== "ArrowDown" && event.key !== "ArrowUp") return;
    const target = event.target as HTMLElement | null;
    if (TYPING_TARGETS.includes(target?.tagName ?? "") || target?.closest("[role=dialog]")) return;

    const ids = entries.value.map((entry) => entry.entityId);
    if (ids.length === 0) return;

    const index = selectedEntityId.value ? ids.indexOf(selectedEntityId.value) : -1;
    const next =
      event.key === "ArrowDown" ? Math.min(ids.length - 1, index + 1) : Math.max(0, index - 1);
    const entityId = ids[next];
    if (!entityId || entityId === selectedEntityId.value) return;

    event.preventDefault();
    select(entityId);
    void nextTick(() =>
      document
        .querySelector(`[data-entity-id="${CSS.escape(entityId)}"]`)
        ?.scrollIntoView({ block: "nearest" }),
    );
  });
}
