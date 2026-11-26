<template>
  <section class="entry-list">
    <div class="entry-list__head">
      <div class="entry-list__title-row">
        <button
          class="icon-btn entry-list__nav-toggle"
          type="button"
          :aria-label="t('nav.open')"
          @click="emit('openNav')"
        >
          <span class="mdi mdi-menu" />
        </button>
        <div class="entry-list__title">
          <div v-if="title.crumb" class="entry-list__crumb">{{ title.crumb }} ›</div>
          <h2>{{ title.name }}</h2>
          <div v-if="title.subtitle" class="entry-list__subtitle">{{ title.subtitle }}</div>
        </div>
        <div ref="newMenu" class="entry-list__new">
          <button
            class="btn btn--primary"
            type="button"
            :aria-expanded="isNewMenuOpen"
            aria-haspopup="menu"
            @click="isNewMenuOpen = !isNewMenuOpen"
          >
            <span class="mdi mdi-plus" />
            <span class="entry-list__new-label">{{ t("list.new") }}</span>
          </button>
          <div v-if="isNewMenuOpen" class="entry-list__new-menu" role="menu">
            <button
              v-for="kind in NEW_ENTRY_KINDS"
              :key="kind"
              type="button"
              role="menuitem"
              @click="pickNew(kind)"
            >
              <span class="entry-list__new-icon" :class="`kind-${kind}`">
                <span class="mdi" :class="ENTRY_KIND_ICON[kind]" />
              </span>
              {{ t(`list.newMenu.${kind}`) }}
            </button>
            <div class="entry-list__new-sep" role="separator" />
            <button type="button" role="menuitem" @click="pickFolder">
              <span class="entry-list__new-icon">
                <span class="mdi mdi-folder-plus-outline" />
              </span>
              {{ isRealCategory ? t("list.newSubfolder") : t("list.newFolder") }}
            </button>
          </div>
        </div>
      </div>

      <label class="entry-list__search">
        <span class="mdi mdi-magnify" />
        <input v-model="search" type="search" :placeholder="t('list.search')" autocomplete="off" />
      </label>

      <ListScopeTabs
        :scopes="scopes"
        :counts="scopeCounts"
        @select="(scope) => emit('selectScope', scope)"
        @toggle="(scope) => emit('toggleScope', scope)"
      />
    </div>

    <div
      class="entry-list__body"
      :class="{ 'entry-list__body--docked': checkedIds.size > 0 || checkedEntityIds.size > 0 }"
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
          :is-selected="entry.entityId === selectedEntityId"
          :has-unsaved-changes="unsavedIds.has(entry.entityId)"
          :is-checked="checkedIds.has(entry.entityId)"
          :is-check-active="checkedIds.size > 0"
          :area-note="areaView ? (areaView.notes[entry.entityId] ?? '') : undefined"
          :is-renaming="entry.entityId === renamingId"
          :is-labels-visible="isListLabelsVisible"
          @start-rename="emit('startRename', entry.entityId)"
          @duplicate="emit('duplicate', entry.entityId)"
          @rename="(name) => emit('rename', entry.entityId, name)"
          @cancel-rename="emit('cancelRename')"
          @check="onCheck"
          :is-technical-details-visible="isTechnicalDetailsVisible"
          @select="(entityId) => emit('select', entityId)"
          @act="(item, action) => emit('act', item, action)"
        />
        <template v-if="isOpen(group) && group.entities.length > 0">
          <div v-if="group.entries.length > 0" class="entry-list__entity-sep">
            <span class="mdi mdi-devices" />{{ t("scope.entities") }}
          </div>
          <EntityListRow
            v-for="entity in shownEntities(group)"
            :key="entity.entityId"
            :entity="entity"
            :is-technical-details-visible="isTechnicalDetailsVisible"
            :is-area-shown="!areaView"
            :is-checked="checkedEntityIds.has(entity.entityId)"
            :is-check-active="checkedEntityIds.size > 0"
            @open="(item, anchor) => emit('openEntity', item, anchor)"
            @check="onEntityCheck"
          />
          <!-- A big HA has hundreds of loose entities; they come in pages, so the list stays fast. -->
          <button
            v-if="group.entities.length > shownEntities(group).length"
            type="button"
            class="entry-list__more"
            @click="showMoreEntities(group)"
          >
            {{
              t("list.moreEntities", {
                count: group.entities.length - shownEntities(group).length,
              })
            }}
          </button>
        </template>
      </template>

      <p v-if="isShowingEntities && isRealCategory && !hasEntities" class="entry-list__hint">
        <span class="mdi mdi-devices" />{{ t("list.noEntitiesHere") }}
      </p>
    </div>
    <!-- Floats over the list, so ticking never pushes the rows away from the pointer -->
    <div v-if="checkedIds.size > 0 || checkedEntityIds.size > 0" class="entry-list__dock">
      <div
        v-if="checkedIds.size > 0"
        ref="bulkBar"
        class="entry-list__bulk"
        role="toolbar"
        :aria-label="t('list.bulk')"
      >
        <b>{{ t("list.checkedCount", { count: checkedIds.size }) }}</b>
        <button class="btn btn--primary" type="button" @click="emit('moveChecked')">
          <span class="mdi mdi-folder-move-outline" />{{ t("list.moveTo") }}
        </button>
        <button class="btn" type="button" @click="emit('setAreaChecked')">
          <span class="mdi mdi-map-marker-outline" />{{ t("areas.set.button") }}
        </button>
        <button
          class="btn"
          type="button"
          data-label-toggle
          @click="bulkBar && emit('labelChecked', bulkBar)"
        >
          <span class="mdi mdi-label-outline" />{{ t("labels.add") }}
        </button>
        <button class="btn" type="button" @click="emit('uncategorizeChecked')">
          {{ t("list.takeOut") }}
        </button>
        <button class="btn entry-list__bulk-quiet" type="button" @click="checkAll">
          {{ t("list.checkAll") }}
        </button>
        <button
          class="icon-btn"
          type="button"
          :aria-label="t('list.clearChecked')"
          :title="t('list.clearChecked')"
          @click="emit('check', [...checkedIds], false)"
        >
          <span class="mdi mdi-close" />
        </button>
      </div>

      <EntityBulkBar
        v-else
        :count="checkedEntityIds.size"
        @move="emit('moveCheckedEntities')"
        @take-out="emit('uncategorizeCheckedEntities')"
        @check-all="emit('checkEntities', visibleEntityIds, true)"
        @clear="emit('checkEntities', [...checkedEntityIds], false)"
      />
    </div>
  </section>
</template>

<script setup lang="ts">
import { onClickOutside, useEventListener } from "@vueuse/core";
import { computed, ref, useTemplateRef, watch, nextTick } from "vue";
import { useI18n } from "vue-i18n";

import {
  CATEGORY_FILTER,
  CATEGORY_SEPARATOR,
  ENTRY_KIND_ICON,
  NEW_ENTRY_KINDS,
  type EntryAction,
  type ListScope,
  type NewEntryKind,
} from "@/constants/entries";
import type { EntityOption } from "@/types/editor";
import type { Entry } from "@/types/entry";
import type { AreaListView } from "@/utils/areaNotes";
import { groupListItems, type ListGroup } from "@/utils/entityList";
import { isGroupOpenByDefault, isSpecialCategory } from "@/utils/entryFilter";

import { rangeBetween } from "@/utils/selection";

import EntityBulkBar from "./EntityBulkBar.vue";
import EntityListRow from "./EntityListRow.vue";
import EntryListRow from "./EntryListRow.vue";
import ListScopeTabs from "./ListScopeTabs.vue";

const search = defineModel<string>("search", { required: true });

const props = defineProps<{
  entries: Entry[];
  /** Plain entities of the view; empty unless the filter "Entitäten" is chosen. */
  entities: EntityOption[];
  scopes: readonly ListScope[];
  isShowingEntities: boolean;
  scopeCounts: Record<ListScope, number>;
  /** Selected tree node: a category path or one of CATEGORY_FILTER. */
  category: string;
  selectedEntityId: string | null;
  /** Entries whose flow has unsaved edits. */
  unsavedIds: ReadonlySet<string>;
  /** Rows ticked for moving several entries at once. */
  checkedIds: ReadonlySet<string>;
  /** Ticked plain entities; never together with ticked entries. */
  checkedEntityIds: ReadonlySet<string>;
  isTechnicalDetailsVisible: boolean;
  /** Label chips under each name (setting "Labels in der Liste zeigen", off by default). */
  isListLabelsVisible: boolean;
  /** Set while an area of the area view is selected: its title and why each entry is in it. */
  areaView: AreaListView | null;
  /** The row whose name is being edited in place. */
  renamingId: string | null;
}>();

const emit = defineEmits<{
  select: [entityId: string];
  openNav: [];
  act: [entry: Entry, action: EntryAction];
  /** "Neu" was picked for this kind; the page opens the matching dialog. */
  create: [kind: NewEntryKind];
  /** New folder below `parent`; null for a top-level folder. */
  addFolder: [parent: string | null];
  /** Tick or untick rows. */
  check: [entityIds: string[], isChecked: boolean];
  checkEntities: [entityIds: string[], isChecked: boolean];
  moveCheckedEntities: [];
  uncategorizeCheckedEntities: [];
  moveChecked: [];
  uncategorizeChecked: [];
  /** "Bereich" for the ticked rows. */
  setAreaChecked: [];
  /** "Label" for the ticked rows; the picker opens next to the bar and never covers it. */
  labelChecked: [bar: HTMLElement];
  startRename: [entityId: string];
  duplicate: [entityId: string];
  rename: [entityId: string, name: string];
  cancelRename: [];
  selectScope: [scope: ListScope];
  toggleScope: [scope: ListScope];
  /** A plain entity was clicked: the page offers where it can go. */
  openEntity: [entity: EntityOption, anchor: HTMLElement];
}>();

const { t } = useI18n();

const BREADCRUMB_SEPARATOR = " › ";

const isNewMenuOpen = ref(false);
const newMenu = useTemplateRef("newMenu");
const bulkBar = useTemplateRef<HTMLElement>("bulkBar");

onClickOutside(newMenu, () => (isNewMenuOpen.value = false));

function pickNew(kind: NewEntryKind): void {
  isNewMenuOpen.value = false;
  emit("create", kind);
}

function pickFolder(): void {
  isNewMenuOpen.value = false;
  addFolder();
}

const TYPING_TARGETS = ["INPUT", "TEXTAREA", "SELECT"];

/** Up and down walk through the open rows (and open the entry), like in a file manager. */
useEventListener(window, "keydown", (event: KeyboardEvent) => {
  if (event.key !== "ArrowDown" && event.key !== "ArrowUp") return;
  const target = event.target as HTMLElement | null;
  if (TYPING_TARGETS.includes(target?.tagName ?? "") || target?.closest("[role=dialog]")) return;

  const ids = groups.value
    .flatMap((group) => (isOpen(group) ? group.entries : []))
    .map((entry) => entry.entityId);
  if (ids.length === 0) return;

  const index = props.selectedEntityId ? ids.indexOf(props.selectedEntityId) : -1;
  const next =
    event.key === "ArrowDown" ? Math.min(ids.length - 1, index + 1) : Math.max(0, index - 1);
  const entityId = ids[next];
  if (!entityId || entityId === props.selectedEntityId) return;

  event.preventDefault();
  emit("select", entityId);
  void nextTick(() =>
    document
      .querySelector(`[data-entity-id="${CSS.escape(entityId)}"]`)
      ?.scrollIntoView({ block: "nearest" }),
  );
});

/** Rows in the order they are shown, for shift-click ranges and "select all". */
const visibleIds = computed(() =>
  groups.value
    .flatMap((group) => (isOpen(group) ? group.entries : []))
    .filter((entry) => entry.isInRegistry)
    .map((entry) => entry.entityId),
);
/** Last clicked checkbox; shift-click ticks everything from here. */
let checkAnchor: string | null = null;

function onCheck(entityId: string, withShift: boolean): void {
  const isChecked = !props.checkedIds.has(entityId);
  const ids = withShift ? rangeBetween(visibleIds.value, checkAnchor, entityId) : [entityId];

  // A range takes the state of the clicked row, so shift-click can also untick a range.
  emit("check", ids, isChecked);
  checkAnchor = entityId;
}

function checkAll(): void {
  emit("check", visibleIds.value, true);
}

/** Plain entities that can be ticked right now: shown, in open groups, with a registry entry. */
const visibleEntityIds = computed(() =>
  groups.value
    .flatMap((group) => (isOpen(group) ? shownEntities(group) : []))
    .filter((entity) => entity.isInRegistry)
    .map((entity) => entity.entityId),
);
/** Last clicked entity box; shift-click ticks everything from here. */
let entityCheckAnchor: string | null = null;

function onEntityCheck(entityId: string, withShift: boolean): void {
  const isChecked = !props.checkedEntityIds.has(entityId);
  const ids = withShift
    ? rangeBetween(visibleEntityIds.value, entityCheckAnchor, entityId)
    : [entityId];

  emit("checkEntities", ids, isChecked);
  entityCheckAnchor = entityId;
}

/** Inside a folder the button makes a subfolder; elsewhere a top-level folder. */
function addFolder(): void {
  emit("addFolder", isRealCategory.value ? props.category : null);
}

const groups = computed(() => groupListItems(props.entries, props.entities));
const hasEntities = computed(() => props.entities.length > 0);

/** Plain entities shown per group at first; more come with "Weitere … anzeigen". */
const ENTITY_PAGE = 150;
const entityLimits = ref<Record<string, number>>({});

function shownEntities(group: ListGroup): EntityOption[] {
  const limit = entityLimits.value[group.path ?? NO_CATEGORY_KEY] ?? ENTITY_PAGE;

  return group.entities.slice(0, limit);
}

function showMoreEntities(group: ListGroup): void {
  const key = group.path ?? NO_CATEGORY_KEY;
  entityLimits.value = { ...entityLimits.value, [key]: shownEntities(group).length + ENTITY_PAGE };
}
const isRealCategory = computed(() => !isSpecialCategory(props.category));

/** Key for the group of entries without a category (its path is null). */
const NO_CATEGORY_KEY = "\u0000";

/** Groups the user opened or closed by hand; reset when another folder is selected. */
const toggledGroups = ref<Record<string, boolean>>({});

watch(
  () => props.category,
  () => {
    toggledGroups.value = {};
    entityLimits.value = {};
  },
);

const isSearching = computed(() => search.value.trim() !== "");

function isOpen(group: ListGroup): boolean {
  // Search results are never hidden in a collapsed group.
  if (isSearching.value) return true;

  return (
    toggledGroups.value[group.path ?? NO_CATEGORY_KEY] ??
    isGroupOpenByDefault(group, {
      category: props.category,
      selectedEntityId: props.selectedEntityId,
      isSearching: isSearching.value,
      groupCount: groups.value.length,
    })
  );
}

function toggleGroup(group: ListGroup): void {
  toggledGroups.value = {
    ...toggledGroups.value,
    [group.path ?? NO_CATEGORY_KEY]: !isOpen(group),
  };
}

const title = computed(() => {
  if (props.areaView)
    return { crumb: "", name: props.areaView.name, subtitle: props.areaView.subtitle };

  if (props.category === CATEGORY_FILTER.all) {
    return { crumb: "", name: t("nav.all"), subtitle: t("list.allSubtitle") };
  }

  if (props.category === CATEGORY_FILTER.favorites) {
    return { crumb: "", name: t("nav.favorites"), subtitle: t("list.favoritesSubtitle") };
  }

  if (props.category === CATEGORY_FILTER.uncategorized) {
    return { crumb: "", name: t("nav.uncategorized"), subtitle: t("list.uncategorizedSubtitle") };
  }

  const segments = props.category.split(CATEGORY_SEPARATOR);
  const name = segments.pop() ?? props.category;

  // How HA stores the folder is a technical detail; the user sees the folder itself.
  return {
    crumb: segments.join(BREADCRUMB_SEPARATOR),
    name,
    subtitle: props.isTechnicalDetailsVisible ? t("list.inHa", { path: props.category }) : "",
  };
});

/** Inside a selected category, group headers show the path relative to it. */
function groupLabel(path: string | null): string {
  if (path === null) return t("nav.uncategorized");
  if (!isRealCategory.value) return path.split(CATEGORY_SEPARATOR).join(BREADCRUMB_SEPARATOR);
  if (path === props.category) return t("list.directIn", { name: title.value.name });

  const relativePath = path.slice(props.category.length + CATEGORY_SEPARATOR.length);

  return relativePath.split(CATEGORY_SEPARATOR).join(BREADCRUMB_SEPARATOR);
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

.entry-list__head {
  display: grid;
  gap: 10px;
  padding: 14px 16px 10px;
  border-bottom: 1px solid var(--line);
}

.entry-list__title-row {
  display: flex;
  align-items: flex-start;
  gap: 8px;
}

.entry-list__nav-toggle {
  display: none;
}

.entry-list__title {
  flex: 1;
  min-width: 0;
}

.entry-list__new {
  position: relative;
  flex: none;
}

.entry-list__new-menu {
  position: absolute;
  top: calc(100% + 6px);
  right: 0;
  z-index: 30;
  display: grid;
  gap: 1px;
  min-width: 190px;
  padding: 6px;
  border: 1px solid var(--line-strong);
  border-radius: 12px;
  background: var(--surface);
  box-shadow: var(--shadow);
}

.entry-list__new-sep {
  height: 1px;
  margin: 4px 6px;
  background: var(--line);
}

.entry-list__new-menu button {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 7px 8px;
  border: 0;
  border-radius: 8px;
  background: none;
  font-weight: 600;
  text-align: left;
  cursor: pointer;
}

.entry-list__new-menu button:hover,
.entry-list__new-menu button:focus-visible {
  background: var(--sunken);
}

.entry-list__new-icon {
  display: grid;
  place-items: center;
  width: 28px;
  height: 28px;
  border-radius: 7px;
  font-size: 17px;
}

.entry-list__crumb {
  color: var(--faint);
  font-size: 12px;
}

.entry-list__title h2 {
  margin: 0;
  font: 700 22px/1.15 var(--font-display);
  letter-spacing: -0.015em;
  text-wrap: balance;
}

.entry-list__subtitle {
  margin-top: 3px;
  color: var(--muted);
  font-size: 12.5px;
}

.entry-list__bulk {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px;
  padding: 8px 8px 8px 12px;
  border-radius: 10px;
  background: var(--accent-soft);
}

.entry-list__bulk b {
  margin-right: auto;
  color: var(--accent);
  font-size: 13px;
}

.entry-list__bulk .btn {
  height: 30px;
  padding: 0 10px;
  font-size: 12.5px;
}

.entry-list__bulk-quiet {
  border-color: transparent;
  background: transparent;
}

.entry-list__search {
  display: flex;
  align-items: center;
  gap: 8px;
  height: 36px;
  padding: 0 10px;
  border-radius: 9px;
  border: 1px solid var(--line);
  background: var(--surface);
  color: var(--faint);
  font-size: 18px;
}

.entry-list__search:focus-within {
  border-color: var(--accent);
  box-shadow: 0 0 0 3px var(--accent-soft);
}

.entry-list__search input {
  flex: 1;
  min-width: 0;
  border: 0;
  outline: 0;
  background: transparent;
  color: var(--fg);
  font-size: 14px;
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

/* Room at the end, so the floating bar never hides the last rows */
.entry-list__body--docked {
  padding-bottom: 130px;
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

@media (max-width: 1180px) {
  .entry-list__nav-toggle {
    display: inline-grid;
  }
}
</style>
