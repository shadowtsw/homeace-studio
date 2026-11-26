import { computed, ref, type Ref, type ShallowRef } from "vue";

import type {
  BundleChoice,
  Confidence,
  PlannedMove,
  SortingBundle,
  SortingComputation,
} from "@/utils/entitySorting/model";

const DEFAULT_FILTERS: Record<Confidence, boolean> = {
  rule: true,
  sure: true,
  likely: false,
  unclear: false,
};

type CreateSortingVisibilityOptions = {
  computation: ShallowRef<SortingComputation | null>;
  choices: Ref<Map<string, BundleChoice>>;
  /** What applying would move. */
  moves: Readonly<Ref<PlannedMove[]>>;
};

/**
 * Which rows of step 3 show: filters by confidence, the search, and the group open as a sheet on
 * phones. A part of the entity sorting store.
 */
export function createSortingVisibility({
  computation,
  choices,
  moves,
}: CreateSortingVisibilityOptions) {
  /** On a phone a group opens as a sheet from below; its key while open. */
  const sheetGroupKey = ref<string | null>(null);
  /** What is pre-ticked shows by default; the rest is one click away (owner's wish, test9). */
  const filters = ref<Record<Confidence, boolean>>({ ...DEFAULT_FILTERS });
  const query = ref("");

  /** Back to the start: default filters, no search. */
  function resetView(): void {
    filters.value = { ...DEFAULT_FILTERS };
    query.value = "";
  }

  function confidenceOf(key: string): Confidence {
    return computation.value?.suggestions.get(key)?.confidence ?? "unclear";
  }

  /** A row shows when it is ticked or matches the filters, and when it matches the search. */
  function isVisible(bundle: SortingBundle): boolean {
    if (!computation.value?.bundles.has(bundle.key)) return false;

    // Ticked rows always show: what is applied is always in sight. Filters add the rest.
    const choice = choices.value.get(bundle.key);
    const isShownAnyway = !!choice?.target || !!choice?.isOn;
    if (!isShownAnyway && !filters.value[confidenceOf(bundle.key)]) return false;

    const needle = query.value.trim().toLowerCase();
    return (
      !needle ||
      bundle.name.toLowerCase().includes(needle) ||
      bundle.entities.some((entity) => entity.name.toLowerCase().includes(needle))
    );
  }

  /** Entities that would be applied although their row is filtered out. */
  const hiddenMoveCount = computed(() => {
    const hidden = new Set(
      [...(computation.value?.bundles.values() ?? [])]
        .filter((bundle) => !isVisible(bundle))
        .flatMap((bundle) => bundle.entities.map((entity) => entity.entityId)),
    );

    return moves.value.filter((move) => hidden.has(move.entityId)).length;
  });

  return {
    sheetGroupKey,
    filters,
    query,
    resetView,
    confidenceOf,
    isVisible,
    hiddenMoveCount,
  };
}
