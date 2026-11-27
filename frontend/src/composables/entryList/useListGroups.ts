import { computed, ref, watch, type Ref } from "vue";

import type { EntityOption } from "@/types/editor";
import type { Entry } from "@/types/entry";
import { groupListItems, type ListGroup } from "@/utils/entities/entityList";
import { isGroupOpenByDefault } from "@/utils/entries/entryFilter";

/** Plain entities shown per group at first; more come with "Weitere … anzeigen". */
const ENTITY_PAGE = 150;
/** Key for the group of entries without a category (its path is null). */
const NO_CATEGORY_KEY = "\u0000";

type UseListGroupsOptions = {
  entries: Ref<Entry[]>;
  entities: Ref<EntityOption[]>;
  /** Selected tree node: a category path or one of CATEGORY_FILTER. */
  category: Ref<string>;
  selectedEntityId: Ref<string | null>;
  isSearching: Ref<boolean>;
};

/**
 * The folder groups of the entry list and which of them are open: as the rules say at first, as
 * the user toggled them until another folder is picked; a search never hides results. Plain
 * entities come in pages, so a big HA stays fast.
 */
export function useListGroups({
  entries,
  entities,
  category,
  selectedEntityId,
  isSearching,
}: UseListGroupsOptions) {
  const groups = computed(() =>
    groupListItems({ entries: entries.value, entities: entities.value }),
  );
  const entityLimits = ref<Record<string, number>>({});
  /** Groups the user opened or closed by hand; reset when another folder is selected. */
  const toggledGroups = ref<Record<string, boolean>>({});

  watch(category, () => {
    toggledGroups.value = {};
    entityLimits.value = {};
  });

  function shownEntities(group: ListGroup): EntityOption[] {
    const limit = entityLimits.value[group.path ?? NO_CATEGORY_KEY] ?? ENTITY_PAGE;

    return group.entities.slice(0, limit);
  }

  function showMoreEntities(group: ListGroup): void {
    const key = group.path ?? NO_CATEGORY_KEY;
    entityLimits.value = {
      ...entityLimits.value,
      [key]: shownEntities(group).length + ENTITY_PAGE,
    };
  }

  function isOpen(group: ListGroup): boolean {
    // Search results are never hidden in a collapsed group.
    if (isSearching.value) return true;

    return (
      toggledGroups.value[group.path ?? NO_CATEGORY_KEY] ??
      isGroupOpenByDefault({
        group,
        context: {
          category: category.value,
          selectedEntityId: selectedEntityId.value,
          isSearching: isSearching.value,
          groupCount: groups.value.length,
        },
      })
    );
  }

  function toggleGroup(group: ListGroup): void {
    toggledGroups.value = {
      ...toggledGroups.value,
      [group.path ?? NO_CATEGORY_KEY]: !isOpen(group),
    };
  }

  /** Entries of the open groups, in the order they are shown. */
  const openEntries = computed(() =>
    groups.value.flatMap((group) => (isOpen(group) ? group.entries : [])),
  );

  /** Plain entities of the open groups, as far as they are shown. */
  const openEntities = computed(() =>
    groups.value.flatMap((group) => (isOpen(group) ? shownEntities(group) : [])),
  );

  return {
    groups,
    isOpen,
    toggleGroup,
    shownEntities,
    showMoreEntities,
    openEntries,
    openEntities,
  };
}
