<template>
  <CheckupList
    v-if="studio.category === CATEGORY_FILTER.checkup"
    :selected-entity-id="studio.selectedEntityId"
    @select="(entityId) => emit('select', entityId)"
    @open-nav="emit('openNav')"
  />
  <EntryList
    v-else
    :entries="data.visibleEntries.value"
    :entities="data.visibleEntities.value"
    :scope-counts="data.scopeCounts.value"
    :unsaved-ids="unsavedIds"
    :area-view="areaView"
    @duplicate="duplicateFromList"
    @rename="(entityId, name) => entryActions.renameInPlace({ entityId, name })"
    @select="(entityId) => emit('select', entityId)"
    @open-nav="emit('openNav')"
    @create="onCreate"
    @add-folder="create.startFolder"
    @move-checked-entities="entityMove.start([...studio.checkedEntityIds])"
    @uncategorize-checked-entities="
      entityMove.move({ entityIds: [...studio.checkedEntityIds], categoryPath: null })
    "
    @move-checked="actions.startMoveMany([...studio.checkedIds])"
    @uncategorize-checked="
      actions.moveEntries({ entityIds: [...studio.checkedIds], categoryPath: null })
    "
    @set-area-checked="areas.startSetArea([...studio.checkedIds])"
    @act="(entry, action) => entryActions.act({ entry, action })"
    @label-checked="(bar) => emit('labelChecked', bar)"
    @open-entity="(entity, anchor) => entityMenu.open({ entity, anchor })"
  />
</template>

<script setup lang="ts">
import { computed } from "vue";
import { useI18n } from "vue-i18n";

import CheckupList from "@/components/checkup/CheckupList.vue";
import EntryList from "@/components/entries/list/EntryList.vue";
import type { useCategoryActions } from "@/composables/actions/useCategoryActions";
import type { useCreateActions } from "@/composables/actions/useCreateActions";
import type { useEntityBulkMove } from "@/composables/actions/useEntityBulkMove";
import type { useEntryActions } from "@/composables/actions/useEntryActions";
import type { useEntityMenu } from "@/composables/useEntityMenu";
import type { useStudioData } from "@/composables/studio/useStudioData";
import { CATEGORY_FILTER, NEW_ENTRY_KIND, type NewEntryKind } from "@/constants/entries";
import { useAreasStore } from "@/stores/areasStore";
import { useEntriesStore } from "@/stores/entriesStore";
import { useEntryAreasStore } from "@/stores/entryAreasStore";
import { useLookupsStore } from "@/stores/lookupsStore";
import { useStudioStore } from "@/stores/studioStore";
import { areaNote, type AreaListView } from "@/utils/areas/areaNotes";
import { areaOfFilter } from "@/utils/entries/entryFilter";

/** The list column: the check-up, or the entries and entities of the pick, with ticking. */
const props = defineProps<{
  data: ReturnType<typeof useStudioData>;
  actions: ReturnType<typeof useCategoryActions>;
  create: ReturnType<typeof useCreateActions>;
  entryActions: ReturnType<typeof useEntryActions>;
  /** Several ticked entities into a folder at once. */
  entityMove: ReturnType<typeof useEntityBulkMove>;
  /** The menu of a plain entity: where it can go in the open flow, and its folder. */
  entityMenu: ReturnType<typeof useEntityMenu>;
  /** Entries with unsaved edits: flows, helper settings and scenes. */
  unsavedIds: Set<string>;
}>();

const emit = defineEmits<{
  select: [entityId: string];
  /** Narrow screens: show the navigation as a drawer. */
  openNav: [];
  /** The labels button of the bulk bar: the picker opens (or closes) at the bar. */
  labelChecked: [bar: HTMLElement];
}>();

const { t } = useI18n();
const studio = useStudioStore();
const areas = useAreasStore();
const entriesStore = useEntriesStore();
const entryAreas = useEntryAreasStore();
const lookups = useLookupsStore();

/** Title and per-row reasons while an area is selected. */
const areaView = computed((): AreaListView | null => {
  const areaId = areaOfFilter(studio.category);

  if (areaId === undefined) return null;
  if (areaId === null)
    return { name: t("areas.none"), subtitle: t("areas.noneSubtitle"), notes: {} };

  const name =
    props.data.areaNav.value.find((area) => area.areaId === areaId)?.name ??
    lookups.areas.find((area) => area.areaId === areaId)?.name ??
    areaId;
  const texts = {
    via: (source: "uses" | "usedBy", via: string) => t(`areas.via.${source}`, { name: via }),
    alsoIn: (names: string) => t("areas.alsoIn", { names }),
  };
  const notes = Object.fromEntries(
    props.data.visibleEntries.value.map((entry) => [
      entry.entityId,
      areaNote({ links: entryAreas.linksOf(entry.entityId), areaId, texts }),
    ]),
  );

  const isEmpty = !props.data.areaNav.value.some(
    (area) => area.areaId === areaId && area.count > 0,
  );

  return { name, subtitle: isEmpty ? t("areas.emptySubtitle") : t("areas.subtitle"), notes };
});

/** "Neu" in the list: automations, scripts and scenes get a name dialog, helpers their own. */
function onCreate(kind: NewEntryKind): void {
  if (kind === NEW_ENTRY_KIND.helper) props.create.openHelperDialog();
  else props.create.openFlowDialog(kind);
}

function duplicateFromList(entityId: string): void {
  const entry = entriesStore.entries.find((item) => item.entityId === entityId);
  if (entry) void props.entryActions.duplicate({ entry, place: "list" });
}
</script>
