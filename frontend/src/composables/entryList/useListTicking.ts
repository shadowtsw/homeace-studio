import { computed, type Ref } from "vue";
import { useI18n } from "vue-i18n";

import { useStudioStore } from "@/stores/studioStore";
import { useToastStore } from "@/stores/toastStore";
import type { EntityOption } from "@/types/editor";
import type { Entry } from "@/types/entry";
import { rangeBetween } from "@/utils/entries/selection";

type UseListTickingOptions = {
  /** Entries of the open groups, in the order they are shown. */
  openEntries: Ref<Entry[]>;
  /** Plain entities of the open groups, as far as they are shown. */
  openEntities: Ref<EntityOption[]>;
};

type CheckOptions = { entityIds: string[]; isChecked: boolean };

/**
 * Ticking rows of the entry list: one, a shift-click range, all shown, none. Entries and plain
 * entities are ticked separately; ticking one kind clears the other, and a toast says so.
 */
export function useListTicking({ openEntries, openEntities }: UseListTickingOptions) {
  const { t } = useI18n();
  const studio = useStudioStore();
  const toasts = useToastStore();

  /** Rows in the order they are shown, for shift-click ranges and "select all". */
  const visibleIds = computed(() =>
    openEntries.value.filter((entry) => entry.isInRegistry).map((entry) => entry.entityId),
  );
  /** Plain entities that can be ticked right now: shown, in open groups, with a registry entry. */
  const visibleEntityIds = computed(() =>
    openEntities.value.filter((entity) => entity.isInRegistry).map((entity) => entity.entityId),
  );
  /** Last clicked boxes; shift-click ticks everything from there. */
  let checkAnchor: string | null = null;
  let entityCheckAnchor: string | null = null;

  function setChecked({ entityIds, isChecked }: CheckOptions): void {
    if (studio.setChecked({ entityIds, isChecked })) {
      toasts.show({ text: t("toast.entityCheckCleared") });
    }
  }

  function setEntityChecked({ entityIds, isChecked }: CheckOptions): void {
    if (studio.setEntityChecked({ entityIds, isChecked })) {
      toasts.show({ text: t("toast.entryCheckCleared") });
    }
  }

  function onCheck(entityId: string, withShift: boolean): void {
    const isChecked = !studio.checkedIds.has(entityId);
    const ids = withShift
      ? rangeBetween({ order: visibleIds.value, anchor: checkAnchor, target: entityId })
      : [entityId];

    // A range takes the state of the clicked row, so shift-click can also untick a range.
    setChecked({ entityIds: ids, isChecked });
    checkAnchor = entityId;
  }

  function onEntityCheck(entityId: string, withShift: boolean): void {
    const isChecked = !studio.checkedEntityIds.has(entityId);
    const ids = withShift
      ? rangeBetween({ order: visibleEntityIds.value, anchor: entityCheckAnchor, target: entityId })
      : [entityId];

    setEntityChecked({ entityIds: ids, isChecked });
    entityCheckAnchor = entityId;
  }

  return {
    onCheck,
    onEntityCheck,
    checkAll: () => setChecked({ entityIds: visibleIds.value, isChecked: true }),
    clearChecked: () => setChecked({ entityIds: [...studio.checkedIds], isChecked: false }),
    checkAllEntities: () =>
      setEntityChecked({ entityIds: visibleEntityIds.value, isChecked: true }),
    clearCheckedEntities: () =>
      setEntityChecked({ entityIds: [...studio.checkedEntityIds], isChecked: false }),
  };
}
