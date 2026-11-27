<template>
  <section class="entry-list">
    <EntryListHead
      :title="title"
      :is-real-category="isRealCategory"
      :scope-counts="scopeCounts"
      @open-nav="emit('openNav')"
      @create="(kind) => emit('create', kind)"
      @add-folder="addFolder"
    />

    <div
      class="entry-list__body"
      :class="{ 'entry-list__body--docked': isDocked }"
      :style="dockRoomStyle"
    >
      <p v-if="entries.length === 0 && entities.length === 0" class="entry-list__empty">
        {{ isRealCategory && !isSearching ? t("list.emptyFolder") : t("list.empty") }}
      </p>

      <template v-for="group in groups" :key="group.path ?? ''">
        <button
          type="button"
          class="entry-list__group"
          :aria-expanded="isOpen(group)"
          @click="toggleGroup(group)"
        >
          <span class="mdi" :class="isOpen(group) ? 'mdi-chevron-down' : 'mdi-chevron-right'" />
          <span class="entry-list__group-name">{{ groupLabel(group.path) }}</span>
          <span class="entry-list__group-line" />
          <span class="entry-list__group-count">{{
            group.entries.length + group.entities.length
          }}</span>
        </button>
        <EntryListRow
          v-for="entry in isOpen(group) ? group.entries : []"
          :key="entry.entityId"
          :entry="entry"
          :is-selected="entry.entityId === studio.selectedEntityId"
          :has-unsaved-changes="unsavedIds.has(entry.entityId)"
          :is-checked="studio.checkedIds.has(entry.entityId)"
          :is-check-active="studio.checkedIds.size > 0"
          :area-note="areaView ? (areaView.notes[entry.entityId] ?? '') : undefined"
          :is-renaming="entry.entityId === renamingId"
          :is-labels-visible="settings.isListLabelsVisible"
          @start-rename="studio.startRename({ entityId: entry.entityId, place: 'list' })"
          @duplicate="emit('duplicate', entry.entityId)"
          @rename="(name) => emit('rename', entry.entityId, name)"
          @cancel-rename="studio.stopRename()"
          @check="onCheck"
          :is-technical-details-visible="settings.isTechnicalDetailsVisible"
          @select="(entityId) => emit('select', entityId)"
          @act="(item, action) => emit('act', item, action)"
        />
        <ListGroupEntities
          v-if="isOpen(group) && group.entities.length > 0"
          :entities="shownEntities(group)"
          :hidden-count="group.entities.length - shownEntities(group).length"
          :has-entries="group.entries.length > 0"
          :is-area-shown="!areaView"
          @open="(item, anchor) => emit('openEntity', item, anchor)"
          @check="onEntityCheck"
          @more="showMoreEntities(group)"
        />
      </template>

      <p v-if="studio.isShowingEntities && isRealCategory && !hasEntities" class="entry-list__hint">
        <span class="mdi mdi-devices" />{{ t("list.noEntitiesHere") }}
      </p>
    </div>
    <!-- Floats over the list, so ticking never pushes the rows away from the pointer -->
    <div v-if="isDocked" ref="dock" class="entry-list__dock">
      <EntryBulkBar
        v-if="studio.checkedIds.size > 0"
        :count="studio.checkedIds.size"
        @move="emit('moveChecked')"
        @set-area="emit('setAreaChecked')"
        @label="(bar) => emit('labelChecked', bar)"
        @take-out="emit('uncategorizeChecked')"
        @check-all="checkAll"
        @clear="clearChecked"
      />

      <EntityBulkBar
        v-else
        :count="studio.checkedEntityIds.size"
        @move="emit('moveCheckedEntities')"
        @take-out="emit('uncategorizeCheckedEntities')"
        @check-all="checkAllEntities"
        @clear="clearCheckedEntities"
      />
    </div>
  </section>
</template>

<script setup lang="ts">
import { useElementSize } from "@vueuse/core";
import { computed, toRef, useTemplateRef } from "vue";
import { useI18n } from "vue-i18n";

import { useListArrowKeys } from "@/composables/entryList/useListArrowKeys";
import { useListGroups } from "@/composables/entryList/useListGroups";
import { useListTicking } from "@/composables/entryList/useListTicking";
import { useListTitle } from "@/composables/entryList/useListTitle";
import type { EntryAction, ListScope, NewEntryKind } from "@/constants/entries";
import { useSettingsStore } from "@/stores/settingsStore";
import { useStudioStore } from "@/stores/studioStore";
import type { EntityOption } from "@/types/editor";
import type { Entry } from "@/types/entry";
import type { AreaListView } from "@/utils/areas/areaNotes";
import { isSpecialCategory } from "@/utils/entries/entryFilter";

import EntityBulkBar from "./EntityBulkBar.vue";
import EntryBulkBar from "./EntryBulkBar.vue";
import EntryListHead from "./EntryListHead.vue";
import EntryListRow from "./EntryListRow.vue";
import ListGroupEntities from "./ListGroupEntities.vue";

/**
 * The entries (and plain entities) of the picked folder or filter, in folder groups, with ticking
 * and the bars for ticked rows. Selection, ticks, scopes and search live in the studio store.
 */
const props = defineProps<{
  entries: Entry[];
  /** Plain entities of the view; empty unless the filter "Entitäten" is chosen. */
  entities: EntityOption[];
  scopeCounts: Record<ListScope, number>;
  /** Entries whose flow has unsaved edits. */
  unsavedIds: ReadonlySet<string>;
  /** Set while an area of the area view is selected: its title and why each entry is in it. */
  areaView: AreaListView | null;
}>();

const emit = defineEmits<{
  select: [entityId: string];
  openNav: [];
  act: [entry: Entry, action: EntryAction];
  /** "Neu" was picked for this kind; the page opens the matching dialog. */
  create: [kind: NewEntryKind];
  /** New folder below `parent`; null for a top-level folder. */
  addFolder: [parent: string | null];
  moveCheckedEntities: [];
  uncategorizeCheckedEntities: [];
  moveChecked: [];
  uncategorizeChecked: [];
  /** "Bereich" for the ticked rows. */
  setAreaChecked: [];
  /** "Label" for the ticked rows; the picker opens next to the bar and never covers it. */
  labelChecked: [bar: HTMLElement];
  duplicate: [entityId: string];
  rename: [entityId: string, name: string];
  /** A plain entity was clicked: the page offers where it can go. */
  openEntity: [entity: EntityOption, anchor: HTMLElement];
}>();

const { t } = useI18n();
const studio = useStudioStore();
const settings = useSettingsStore();

/** Gap between the floating bar and the list's bottom edge (its `bottom`), plus a little air. */
const DOCK_ROOM_EXTRA_PX = 18;
const dock = useTemplateRef<HTMLElement>("dock");
// The bar wraps to more lines in some languages and in a narrow list, so its room is measured.
const { height: dockHeight } = useElementSize(dock, undefined, { box: "border-box" });
const dockRoomStyle = computed(() =>
  dockHeight.value > 0
    ? { "--dock-room": `${Math.ceil(dockHeight.value) + DOCK_ROOM_EXTRA_PX}px` }
    : {},
);
/** Rows are ticked, so a bar floats over the list. */
const isDocked = computed(() => studio.checkedIds.size > 0 || studio.checkedEntityIds.size > 0);

const category = computed(() => studio.category);
const selectedEntityId = computed(() => studio.selectedEntityId);
const isRealCategory = computed(() => !isSpecialCategory(studio.category));
const isSearching = computed(() => studio.search.trim() !== "");
const hasEntities = computed(() => props.entities.length > 0);
/** The row whose name is being edited in place. */
const renamingId = computed(() =>
  studio.renaming?.place === "list" ? studio.renaming.entityId : null,
);

const { groups, isOpen, toggleGroup, shownEntities, showMoreEntities, openEntries, openEntities } =
  useListGroups({
    entries: toRef(props, "entries"),
    entities: toRef(props, "entities"),
    category,
    selectedEntityId,
    isSearching,
  });
const { title, groupLabel } = useListTitle({
  category,
  areaView: toRef(props, "areaView"),
  isRealCategory,
  isTechnicalDetailsVisible: computed(() => settings.isTechnicalDetailsVisible),
});
const { onCheck, onEntityCheck, checkAll, clearChecked, checkAllEntities, clearCheckedEntities } =
  useListTicking({ openEntries, openEntities });
useListArrowKeys({
  entries: openEntries,
  selectedEntityId,
  select: (entityId) => emit("select", entityId),
});

/** Inside a folder the button makes a subfolder; elsewhere a top-level folder. */
function addFolder(): void {
  emit("addFolder", isRealCategory.value ? studio.category : null);
}
</script>

<style scoped>
.entry-list {
  position: relative;
  display: flex;
  flex-direction: column;
  min-height: 0;
  height: 100%;
}

/* The selection bar floats at the bottom; an opaque ground, so rows behind do not shine through. */
.entry-list__dock {
  position: absolute;
  /* Leaves the list's scrollbar free */
  right: 18px;
  bottom: 10px;
  left: 10px;
  z-index: 5;
  border-radius: 10px;
  background: var(--surface);
  box-shadow: var(--shadow);
}

/* Plain entities inside a folder group, after its entries */
.entry-list__entity-sep {
  display: flex;
  align-items: center;
  gap: 6px;
  margin: 8px 10px 2px 16px;
  color: var(--faint);
  font-size: 11.5px;
  font-weight: 600;
  letter-spacing: 0.05em;
  text-transform: uppercase;
}

.entry-list__more {
  display: block;
  margin: 4px 0 8px 26px;
  padding: 4px 8px;
  border: 0;
  border-radius: 7px;
  background: none;
  color: var(--accent);
  font: inherit;
  font-size: 12.5px;
  font-weight: 600;
  cursor: pointer;
}

.entry-list__more:hover {
  background: var(--sunken);
}

.entry-list__hint {
  display: flex;
  gap: 8px;
  margin: 12px 6px;
  padding: 9px 11px;
  border-radius: 10px;
  background: var(--sunken);
  color: var(--muted);
  font-size: 12.5px;
  line-height: 1.45;
}

.entry-list__body {
  flex: 1;
  overflow: auto;
  padding: 6px 10px 30px;
}

/* Room at the end, so the floating bar never hides the last rows. The scroll padding keeps a row
   that arrow keys or Tab scroll to above the bar, not under it. --dock-room is the bar's measured
   height (dockRoomStyle); the fallback covers the bar on three lines until it is measured. */
.entry-list__body--docked {
  padding-bottom: var(--dock-room, 140px);
  scroll-padding-bottom: var(--dock-room, 140px);
}

.entry-list__group {
  display: flex;
  align-items: center;
  gap: 6px;
  width: calc(100% - 4px);
  margin: 10px 2px 4px;
  padding: 5px 6px;
  border: 0;
  border-radius: 7px;
  background: none;
  color: var(--muted);
  font-size: 12px;
  font-weight: 600;
  text-align: left;
  cursor: pointer;
}

.entry-list__group:hover {
  background: var(--sunken);
  color: var(--fg);
}

.entry-list__group .mdi {
  color: var(--faint);
  font-size: 16px;
}

.entry-list__group-name {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.entry-list__group-line {
  flex: 1;
  height: 1px;
  background: var(--line);
}

.entry-list__group-count {
  color: var(--faint);
  font-weight: 500;
  font-variant-numeric: tabular-nums;
}

.entry-list__empty {
  padding: 40px 20px;
  color: var(--muted);
  text-align: center;
}
</style>
