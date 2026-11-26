<template>
  <div
    class="studio-view"
    :class="{
      'studio-view--nav-open': isNavOpen,
      'studio-view--detail-open': isDetailOpen,
      'studio-view--detail-folded': layout.isDetailFolded,
    }"
    :style="{
      '--w-nav': `${layout.paneWidths.nav}px`,
      '--w-list': `${layout.paneWidths.list}px`,
    }"
  >
    <AppTopBar
      :status="connectionStatus"
      :is-live="isLive"
      :entry-count="entriesStore.entries.length"
    />

    <div v-if="entriesStore.hasLoadError" class="studio-view__error" role="alert">
      <span class="mdi mdi-lan-disconnect" />
      {{ t("errors.loadFailed") }}
      <button class="btn" type="button" @click="entriesStore.load()">
        {{ t("errors.retry") }}
      </button>
    </div>

    <main class="studio-view__panes">
      <aside class="studio-view__nav">
        <CategoryTree
          :tree="data.tree.value"
          :selected="studio.category"
          :total-count="data.scopedEntries.value.length"
          :uncategorized-count="data.uncategorizedCount.value"
          :favorite-count="data.favoriteCount.value"
          :checkup-count="checkup.hasLoaded ? checkup.findings.length : null"
          :colors="foldersStore.colors"
          :mode="layout.navMode"
          :renaming-path="actions.inlineRenamingPath.value"
          :has-own-order="Object.keys(foldersStore.order).length > 0"
          @reorder="reorderFolder"
          @reset-order="actions.resetOrder"
          @start-inline-rename="actions.startInlineRename"
          @rename-inline="(path, name) => actions.renameInline(path, name)"
          @cancel-inline-rename="actions.cancelInlineRename"
          @update:mode="setNavMode"
          @select="selectCategory"
          @rename="actions.startRename"
          @drop-entry="dropEntry"
          @drop-entity="dropEntity"
          @add-folder="create.startFolder"
          @delete-folder="create.deleteFolder"
          @pick-color="(path) => (colorPath = path)"
        >
          <template #notices>
            <AiPlanHint />
            <CleanupHint v-if="cleanup.isHintVisible" />
          </template>
          <template #areas>
            <AreaNav
              :areas="data.areaNav.value"
              :no-area-count="data.noAreaCount.value"
              :loose-count="looseAreaCount"
              :selected="studio.category"
              :has-loaded="entryAreas.hasLoaded"
              @select="selectCategory"
              @tidy="actions.startAreaTidy"
              @create="areas.startCreate((area) => selectCategory(areaFilter(area.areaId)))"
              @edit="(areaId) => withArea(areaId, areas.startEdit)"
              @delete="(areaId) => withArea(areaId, areas.startDelete)"
              @drop-entry="dropOnArea"
              @rename-area="(areaId, name) => areaActions.renameArea(areaId, name)"
            />
          </template>
        </CategoryTree>
      </aside>
      <PaneSplitter
        v-model="navWidth"
        class="studio-view__splitter-nav"
        :label="t('nav.resize')"
        :min="PANE_WIDTH_LIMITS.nav.min"
        :max="PANE_WIDTH_LIMITS.nav.max"
        @reset="layout.resetPaneWidth(PANE.nav)"
      />

      <div class="studio-view__list">
        <CheckupList
          v-if="studio.category === CATEGORY_FILTER.checkup"
          :selected-entity-id="studio.selectedEntityId"
          @select="selectEntry"
          @open-nav="isNavOpen = true"
        />
        <EntryList
          v-else
          v-model:search="studio.search"
          :scopes="studio.scopes"
          :is-showing-entities="studio.isShowingEntities"
          :entries="data.visibleEntries.value"
          :entities="data.visibleEntities.value"
          :scope-counts="data.scopeCounts.value"
          :category="studio.category"
          :selected-entity-id="studio.selectedEntityId"
          :unsaved-ids="unsavedIds"
          :checked-ids="studio.checkedIds"
          :checked-entity-ids="studio.checkedEntityIds"
          :is-technical-details-visible="settings.isTechnicalDetailsVisible"
          :is-list-labels-visible="settings.isListLabelsVisible"
          :area-view="areaView"
          :renaming-id="studio.renaming?.place === 'list' ? studio.renaming.entityId : null"
          @start-rename="(entityId) => studio.startRename(entityId, 'list')"
          @duplicate="duplicateFromList"
          @rename="renameEntry"
          @cancel-rename="studio.stopRename()"
          @select="selectEntry"
          @open-nav="isNavOpen = true"
          @create="onCreate"
          @add-folder="create.startFolder"
          @check="checkEntries"
          @check-entities="checkEntities"
          @move-checked-entities="entityMove.start([...studio.checkedEntityIds])"
          @uncategorize-checked-entities="entityMove.move([...studio.checkedEntityIds], null)"
          @move-checked="actions.startMoveMany([...studio.checkedIds])"
          @uncategorize-checked="actions.moveEntries([...studio.checkedIds], null)"
          @set-area-checked="areas.startSetArea([...studio.checkedIds])"
          @act="entryActions.act"
          @label-checked="(bar) => (bulkLabelField = bulkLabelField ? null : bar)"
          @select-scope="studio.selectScope"
          @toggle-scope="studio.toggleListScope"
          @open-entity="openEntity"
        />
      </div>
      <PaneSplitter
        v-model="listWidth"
        class="studio-view__splitter-list"
        :label="t('list.resize')"
        :min="PANE_WIDTH_LIMITS.list.min"
        :max="PANE_WIDTH_LIMITS.list.max"
        @reset="layout.resetPaneWidth(PANE.list)"
      >
        <button
          class="studio-view__fold"
          type="button"
          :title="layout.isDetailFolded ? t('detail.unfold') : t('detail.fold')"
          :aria-label="layout.isDetailFolded ? t('detail.unfold') : t('detail.fold')"
          :aria-expanded="!layout.isDetailFolded"
          @click="layout.isDetailFolded = !layout.isDetailFolded"
        >
          <span
            class="mdi"
            :class="layout.isDetailFolded ? 'mdi-chevron-left' : 'mdi-chevron-right'"
          />
        </button>
      </PaneSplitter>

      <div class="studio-view__detail">
        <EntryDetail
          :entry="data.selectedEntry.value"
          :is-technical-details-visible="settings.isTechnicalDetailsVisible"
          :all-category-paths="data.allCategoryPaths.value"
          :areas="lookups.areas"
          :labels="lookups.labels"
          :is-busy="isBusy"
          :display-flow="displayFlow"
          :catalog="editorStore.catalogs[settings.locale] ?? null"
          :is-flow-loading="editorStore.isFlowLoading"
          :has-flow-error="editorStore.hasFlowError"
          :is-flow-editable="editorStore.flow?.isEditable ?? false"
          :has-unsaved-changes="editorStore.isDirty"
          :has-remote-change="editorStore.hasRemoteChange"
          :is-flow-saving="editorStore.isSaving"
          @back="isDetailOpen = false"
          @move="onMove"
          @save="onSave"
          @act="onAct"
          @toggle-favorite="onToggleFavorite"
          @save-note="onSaveNote"
          @delete="onDelete"
          @change-flow="editorStore.applyChange"
          @save-flow="onSaveFlow"
          @discard-flow="editorStore.discard"
          :findings="checkup.findingsFor(data.selectedEntry.value?.entityId)"
          @ignore-finding="ignoreFinding"
          @open="selectEntry"
          @ask-disable="onAskDisable"
          :is-renaming="
            studio.renaming?.place === 'title' &&
            studio.renaming.entityId === data.selectedEntry.value?.entityId
          "
          @start-rename="startTitleRename"
          @duplicate="onDuplicate"
          @rename="(name) => renameEntry(data.selectedEntry.value?.entityId ?? '', name)"
          @cancel-rename="studio.stopRename()"
          @rename-id="onRenameId"
        />
      </div>
    </main>

    <div class="studio-view__scrim" @click="isNavOpen = false" />

    <LabelPicker
      v-if="bulkLabelField && studio.checkedIds.size > 0"
      :field="bulkLabelField"
      :labels="lookups.labels"
      :checked-ids="bulkLabels.all"
      :partial-ids="bulkLabels.some"
      :counts="labelActions.counts.value"
      :is-busy="labelActions.isBusy.value"
      @toggle="(labelId) => labelActions.toggleOnEntries(labelId, [...studio.checkedIds])"
      @create="createBulkLabel"
      @update="(labelId, fields) => void labelActions.update(labelId, fields)"
      @delete="deleteBulkLabel"
      @close="bulkLabelField = null"
    />
    <MoveEntriesDialog
      v-if="entityMove.movingIds.value"
      :count="entityMove.movingIds.value.length"
      :title="
        t(
          'list.entityMoveTitle',
          { count: entityMove.movingIds.value.length },
          entityMove.movingIds.value.length,
        )
      "
      :all-paths="data.allCategoryPaths.value"
      :is-busy="entityMove.isBusy.value"
      @cancel="entityMove.cancel"
      @confirm="(path) => entityMove.move(entityMove.movingIds.value ?? [], path)"
    />
    <QuickMenu
      v-if="entityMenu.menu.value"
      :anchor="entityMenu.menu.value.anchor"
      :title="entityMenu.menu.value.title"
      :items="entityMenu.menu.value.items"
      @pick="entityMenu.pick"
      @close="entityMenu.close"
    />
    <StudioDialogs
      :all-paths="data.allCategoryPaths.value"
      :current-folder="data.currentFolder.value"
      :color-path="colorPath"
      :actions="actions"
      :create="create"
      :entry-actions="entryActions"
      :area-actions="areaActions"
      @close-color="colorPath = null"
      @created="selectEntry"
      @folder-created="selectCategory"
      @tidied="onTidied"
    />
  </div>
</template>

<script setup lang="ts">
import { useEventListener } from "@vueuse/core";
import { computed, onMounted, ref, watch } from "vue";
import { useI18n } from "vue-i18n";

import CategoryTree from "@/components/categories/CategoryTree.vue";
import CheckupList from "@/components/checkup/CheckupList.vue";
import QuickMenu from "@/components/common/QuickMenu.vue";
import MoveEntriesDialog from "@/components/entries/MoveEntriesDialog.vue";
import LabelPicker from "@/components/labels/LabelPicker.vue";
import AiPlanHint from "@/components/ai/AiPlanHint.vue";
import AreaNav from "@/components/areas/AreaNav.vue";
import CleanupHint from "@/components/cleanup/CleanupHint.vue";
import EntryDetail from "@/components/entries/EntryDetail.vue";
import EntryList from "@/components/entries/EntryList.vue";
import AppTopBar, { type ConnectionStatus } from "@/components/layout/AppTopBar.vue";
import PaneSplitter from "@/components/layout/PaneSplitter.vue";
import { useAreaActions } from "@/composables/useAreaActions";
import { useCategoryActions } from "@/composables/useCategoryActions";
import { useEntityMenu } from "@/composables/useEntityMenu";
import { useLabelActions } from "@/composables/useLabelActions";
import { useCreateActions } from "@/composables/useCreateActions";
import { useEntryActions } from "@/composables/useEntryActions";
import { useFlowTexts } from "@/composables/useFlowTexts";
import { useLiveUpdates } from "@/composables/useLiveUpdates";
import { useStudioData } from "@/composables/useStudioData";
import {
  CATEGORY_FILTER,
  NAV_MODE,
  NEW_ENTRY_KIND,
  type NavMode,
  type EntryAction,
  type NewEntryKind,
} from "@/constants/entries";
import { PANE, PANE_WIDTH_LIMITS } from "@/constants/layout";
import { useAiStore } from "@/stores/aiStore";
import { useAreasStore } from "@/stores/areasStore";
import { useCheckupStore } from "@/stores/checkupStore";
import { useCleanupStore } from "@/stores/cleanupStore";
import { useDependenciesStore } from "@/stores/dependenciesStore";
import { useDraftsStore } from "@/stores/draftsStore";
import { useEditorStore } from "@/stores/editorStore";
import { useEntriesStore } from "@/stores/entriesStore";
import { useEntryAreasStore } from "@/stores/entryAreasStore";
import { useFoldersStore } from "@/stores/foldersStore";
import { useLayoutStore } from "@/stores/layoutStore";
import { useLookupsStore } from "@/stores/lookupsStore";
import { useMessagesStore } from "@/stores/messagesStore";
import { useSettingsStore } from "@/stores/settingsStore";
import { useStudioStore } from "@/stores/studioStore";
import { useTracesStore } from "@/stores/tracesStore";
import { useToastStore } from "@/stores/toastStore";
import { useEntityBulkMove } from "@/composables/useEntityBulkMove";
import type { EntityOption } from "@/types/editor";
import type { Area, Entry, EntryChanges, Label } from "@/types/entry";
import { areaNote, type AreaListView } from "@/utils/areaNotes";
import { tidyCandidates } from "@/utils/areaTidy";
import { areaFilter, areaOfFilter } from "@/utils/entryFilter";
import type { CategoryNode } from "@/utils/categoryTree";
import { markGoneChips } from "@/utils/flow/markGoneChips";
import { moveSibling, parentOf } from "@/utils/folderOrder";
import { toDisplayFlow } from "@/utils/flow/toDisplayFlow";

import StudioDialogs from "@/components/layout/StudioDialogs.vue";

const { t } = useI18n();
const entriesStore = useEntriesStore();
const foldersStore = useFoldersStore();
const lookups = useLookupsStore();
const layout = useLayoutStore();
const settings = useSettingsStore();
const studio = useStudioStore();
const data = useStudioData();
const actions = useCategoryActions();
const create = useCreateActions();
const entryActions = useEntryActions();
const { isLive } = useLiveUpdates();
const editorStore = useEditorStore();
const draftsStore = useDraftsStore();
const flowTexts = useFlowTexts();
const toasts = useToastStore();
/** Several ticked entities into a folder, with its own folder dialog. */
const entityMove = useEntityBulkMove();
const messages = useMessagesStore();
const cleanup = useCleanupStore();
const ai = useAiStore();
const checkup = useCheckupStore();
const dependencies = useDependenciesStore();
const traces = useTracesStore();
const entryAreas = useEntryAreasStore();
const areas = useAreasStore();
const areaActions = useAreaActions();

function withArea(areaId: string, action: (area: Area) => void): void {
  const area = lookups.areas.find((item) => item.areaId === areaId);
  if (area) action(area);
}

/** Dropping a ticked row gives every ticked row the area; any other row gets it alone. */
function dropOnArea(areaId: string | null, entityId: string): void {
  const ids =
    studio.checkedIds.has(entityId) && studio.checkedIds.size > 1
      ? [...studio.checkedIds]
      : [entityId];
  void areaActions.setOwnArea(ids, areaId);
}

/** Switching to the areas opens the first one; back to the folders, an area selection becomes "all". */
function setNavMode(mode: NavMode): void {
  layout.navMode = mode;

  if (mode === NAV_MODE.areas) {
    const first = data.areaNav.value[0];
    selectCategory(first ? areaFilter(first.areaId) : areaFilter(null));
  } else if (areaOfFilter(studio.category) !== undefined) {
    selectCategory(CATEGORY_FILTER.all);
  }
}

/** After sorting by area the new folders are what the user wants to see. */
function onTidied(path: string): void {
  layout.navMode = NAV_MODE.folders;
  selectCategory(path);
}

/** Entries without a folder that have an area; "Ordnung in einem Klick" shows when there are any. */
const looseAreaCount = computed(
  () =>
    tidyCandidates({ entries: entriesStore.entries, linksOf: entryAreas.linksOf }).filter(
      (entry) => entry.categoryPath === null,
    ).length,
);

/** Title and per-row reasons while an area is selected. */
const areaView = computed((): AreaListView | null => {
  const areaId = areaOfFilter(studio.category);

  if (areaId === undefined) return null;
  if (areaId === null)
    return { name: t("areas.none"), subtitle: t("areas.noneSubtitle"), notes: {} };

  const name =
    data.areaNav.value.find((area) => area.areaId === areaId)?.name ??
    lookups.areas.find((area) => area.areaId === areaId)?.name ??
    areaId;
  const texts = {
    via: (source: "uses" | "usedBy", via: string) => t(`areas.via.${source}`, { name: via }),
    alsoIn: (names: string) => t("areas.alsoIn", { names }),
  };
  const notes = Object.fromEntries(
    data.visibleEntries.value.map((entry) => [
      entry.entityId,
      areaNote(entryAreas.linksOf(entry.entityId), areaId, texts),
    ]),
  );

  const isEmpty = !data.areaNav.value.some((area) => area.areaId === areaId && area.count > 0);

  return { name, subtitle: isEmpty ? t("areas.emptySubtitle") : t("areas.subtitle"), notes };
});

/** Kinds whose flow the detail view shows. */
const FLOW_KINDS = ["automation", "script"];

// Opening an automation or script loads its flow; anything else clears it.
watch(
  () => data.selectedEntry.value?.entityId,
  (entityId) => {
    const entry = data.selectedEntry.value;
    // "Alles rückgängig" of a scene only reaches back while that scene stays open.
    draftsStore.forgetUndo(entityId);

    if (entityId && entry && FLOW_KINDS.includes(entry.kind)) {
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

const displayFlow = computed(() => {
  const flow = editorStore.editedFlow;

  if (!flow || flow.entityId !== data.selectedEntry.value?.entityId) return null;

  // Entities picked in the editor are not in the flow's own name list yet; areas show by name.
  const areaNames = Object.fromEntries(lookups.areas.map((area) => [area.areaId, area.name]));
  const entityNames = { ...areaNames, ...lookups.entityNames, ...flow.entityNames };

  const targetNames = {
    floors: Object.fromEntries(lookups.floors.map((floor) => [floor.floorId, floor.name])),
    labels: Object.fromEntries(lookups.labels.map((label) => [label.labelId, label.name])),
  };

  const display = toDisplayFlow(
    { ...flow, entityNames },
    editorStore.catalogs[settings.locale] ?? null,
    flowTexts.value,
    targetNames,
  );
  // Entities the check-up found missing show in red.
  const gone = new Set(
    checkup
      .findingsFor(flow.entityId)
      .filter((finding) => finding.kind === "gone")
      .flatMap((finding) => finding.refs.map((ref) => ref.entityId)),
  );

  return display ? markGoneChips(display, gone) : display;
});

/** Entries with unsaved edits: flows, helper settings and scenes. */
const unsavedIds = computed(() => new Set([...editorStore.unsavedIds, ...draftsStore.unsavedIds]));

// Unsaved edits live only in this tab; the browser asks before they are lost.
useEventListener(window, "beforeunload", (event: BeforeUnloadEvent) => {
  if (unsavedIds.value.size > 0) event.preventDefault();
});

/** Only used on narrow screens (CSS decides): nav as drawer, detail as full-screen layer. */
const isNavOpen = ref(false);
const isDetailOpen = ref(false);
/** The folder whose color dialog is open; null when closed. */
const colorPath = ref<string | null>(null);

const isBusy = computed(() => actions.isBusy.value || entryActions.isBusy.value);

/** Wraps a detail handler so it only runs while an entry is open (the detail is empty otherwise). */
function onSelected<Args extends unknown[]>(
  handler: (entry: Entry, ...args: Args) => Promise<unknown> | void,
): (...args: Args) => void {
  return (...args) => {
    const entry = data.selectedEntry.value;

    if (entry) void handler(entry, ...args);
  };
}

const onMove = onSelected((entry, path: string | null) => actions.moveEntry(entry.entityId, path));
const onSave = onSelected((entry, changes: EntryChanges) =>
  entryActions.save(entry.entityId, changes),
);
const onAct = onSelected((entry, action: EntryAction) => entryActions.act(entry, action));
const onToggleFavorite = onSelected((entry) => entryActions.toggleFavorite(entry));
const onSaveNote = onSelected((entry, note: string) => entryActions.saveNote(entry, note));
const onDelete = onSelected((entry) => entryActions.askDelete(entry));
const onAskDisable = onSelected((entry) => entryActions.askDisable(entry));
const onDuplicate = onSelected((entry) => entryActions.duplicate(entry));
const onRenameId = onSelected((entry, preset: string | null) =>
  entryActions.startRenameId(entry, preset),
);
const onSaveFlow = onSelected(async (entry) => {
  try {
    await editorStore.save();
    toasts.show(t("toast.flowSaved", { name: entry.name }));
  } catch (error) {
    toasts.show(messages.textFor(error, t("errors.actionFailed")), "error");
  }
});

const navWidth = computed({
  get: () => layout.paneWidths.nav,
  set: (width: number) => layout.setPaneWidth(PANE.nav, width),
});
const listWidth = computed({
  get: () => layout.paneWidths.list,
  set: (width: number) => layout.setPaneWidth(PANE.list, width),
});

const connectionStatus = computed<ConnectionStatus>(() => {
  if (entriesStore.hasLoadError) return "failed";
  if (entriesStore.isLoading) return "loading";

  return "connected";
});

function selectCategory(path: string): void {
  studio.selectCategory(path);
  isNavOpen.value = false;
}

async function ignoreFinding(key: string): Promise<void> {
  try {
    await checkup.ignore(key);
    toasts.show(t("toast.findingIgnored"));
  } catch (error) {
    toasts.show(messages.textFor(error, t("errors.actionFailed")), "error");
  }
}

/** Dropping a ticked row moves every ticked row; any other row moves alone. */
/** A plain entity was clicked (or tapped): where it can go in the open flow, and its folder. */
const entityMenu = useEntityMenu({
  displayFlow,
  flowId: computed(() => editorStore.flow?.entityId ?? null),
  flowKind: computed(() => editorStore.flow?.kind ?? null),
  isFlowEditable: computed(
    () => editorStore.flow?.isEditable === true && displayFlow.value !== null,
  ),
  isSceneOpen: computed(() => data.selectedEntry.value?.kind === "scene"),
  catalog: computed(() => editorStore.catalogs[settings.locale] ?? null),
  applyChange: (change) => editorStore.applyChange(change),
  showDetail: () => {
    isDetailOpen.value = true;
    layout.isDetailFolded = false;
  },
  startMoveEntity: (entity) => actions.startMoveEntity(entity),
});

// ---- labels for the ticked rows (Mehrfachauswahl) -------------------------------------------

const labelActions = useLabelActions();
/** The bulk bar while its label picker is open; null when closed. */
const bulkLabelField = ref<HTMLElement | null>(null);

/** Labels on every ticked entry (ticked in the picker) and on some of them (a dash). */
const bulkLabels = computed(() => {
  const ticked = entriesStore.entries.filter((entry) => studio.checkedIds.has(entry.entityId));
  const countOf = new Map<string, number>();
  for (const entry of ticked)
    for (const label of entry.labels)
      countOf.set(label.labelId, (countOf.get(label.labelId) ?? 0) + 1);
  const all = [...countOf].filter(([, count]) => count === ticked.length).map(([id]) => id);
  const some = [...countOf].filter(([, count]) => count < ticked.length).map(([id]) => id);

  return { all, some };
});

/** A new label goes to every ticked entry at once. */
async function createBulkLabel(name: string): Promise<void> {
  const label = await labelActions.create(name);
  if (label) await labelActions.toggleOnEntries(label.labelId, [...studio.checkedIds]);
}

function deleteBulkLabel(label: Label): void {
  bulkLabelField.value = null;
  void labelActions.startDelete(label);
}

function openEntity(entity: EntityOption, anchor: HTMLElement): void {
  entityMenu.open(entity, anchor);
}

function dropEntry(path: string | null, entityId: string): void {
  if (studio.checkedIds.has(entityId) && studio.checkedIds.size > 1) {
    void actions.moveEntries([...studio.checkedIds], path);
  } else {
    void actions.moveEntry(entityId, path);
  }
}

/** A ticked entity dropped on a folder takes all ticked ones along, like entries do. */
function dropEntity(path: string | null, entityId: string): void {
  if (studio.checkedEntityIds.has(entityId) && studio.checkedEntityIds.size > 1) {
    void entityMove.move([...studio.checkedEntityIds], path);
  } else {
    void actions.moveEntity(entityId, path);
  }
}

/** Entries and entities are ticked separately; ticking one kind clears the other, and says so. */
function checkEntries(entityIds: string[], isChecked: boolean): void {
  if (studio.setChecked(entityIds, isChecked)) toasts.show(t("toast.entityCheckCleared"));
}

function checkEntities(entityIds: string[], isChecked: boolean): void {
  if (studio.setEntityChecked(entityIds, isChecked)) {
    toasts.show(t("toast.entryCheckCleared"));
  }
}

/** "Neu" in the list: automations, scripts and scenes get a name dialog, helpers their own. */
function onCreate(kind: NewEntryKind): void {
  if (kind === NEW_ENTRY_KIND.helper) create.openHelperDialog();
  else create.openFlowDialog(kind);
}

/** A folder dropped before or after a sibling: the whole sibling list is saved in that order. */
function reorderFolder(moved: string, target: string, isBefore: boolean): void {
  const parent = parentOf(moved);
  const find = (nodes: CategoryNode[]): CategoryNode[] | null => {
    if (parent === "") return nodes;
    for (const node of nodes) {
      if (node.path === parent) return node.children;
      const found = find(node.children);
      if (found) return found;
    }
    return null;
  };
  const siblings = (find(data.tree.value) ?? []).map((node) => node.path);
  const previous = foldersStore.order[parent] ?? [];
  void actions.saveOrder(parent, moveSibling(siblings, moved, target, isBefore), [...previous]);
}

function renameEntry(entityId: string, name: string): void {
  studio.stopRename();
  const entry = entriesStore.entries.find((item) => item.entityId === entityId);
  if (entry) void entryActions.rename(entry, name);
}

function duplicateFromList(entityId: string): void {
  const entry = entriesStore.entries.find((item) => item.entityId === entityId);
  if (entry) void entryActions.duplicate(entry, "list");
}

function startTitleRename(): void {
  const entityId = data.selectedEntry.value?.entityId;
  if (entityId) studio.startRename(entityId, "title");
}

const TYPING_TARGETS = ["INPUT", "TEXTAREA", "SELECT"];

/** F2 renames the open entry: in its list row when it is visible, else in the title. */
useEventListener(window, "keydown", (event: KeyboardEvent) => {
  const target = event.target as HTMLElement | null;
  if (event.key !== "F2" || TYPING_TARGETS.includes(target?.tagName ?? "")) return;

  const entry = data.selectedEntry.value;
  if (!entry?.isInRegistry) return;

  event.preventDefault();
  const row = document.querySelector(`[data-entity-id="${CSS.escape(entry.entityId)}"]`);
  studio.startRename(entry.entityId, row ? "list" : "title");
});

function selectEntry(entityId: string): void {
  studio.selectEntry(entityId);
  isDetailOpen.value = true;
  layout.isDetailFolded = false;
}

// Proposals follow the categories: after moves, renames and live updates from HA.
watch(
  () => entriesStore.entries,
  () => {
    void cleanup.load();
    void checkup.load();
    void dependencies.refresh();
    void traces.refresh();
    void entryAreas.load();
  },
);

onMounted(() => {
  void entriesStore.load();
  void foldersStore.load();
  void lookups.load();
  // Plain entities: counts on the filter and their folders in the tree
  void lookups.loadEntities();
  void ai.loadPlans();
});
</script>

<style scoped>
.studio-view {
  display: grid;
  grid-template-rows: auto auto minmax(0, 1fr);
  height: 100%;
}

/*
 * Fixed rows: without them the panes slid into the banner's row whenever there is no error, and
 * the empty last row left a strip at the bottom.
 */
.studio-view__error {
  grid-row: 2;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 16px;
  background: var(--err-soft);
  color: var(--err);
  font-weight: 600;
}

/*
 * nav | splitter | list | splitter | detail; splitters take no width of their own.
 * min() keeps at least 380px for the detail, whatever width the list was dragged to.
 */
.studio-view__panes {
  /* Width of the rail that holds the fold button while the details are folded. */
  --fold-rail: 28px;

  grid-row: 3;
  display: grid;
  grid-template-columns:
    var(--w-nav) 0 min(var(--w-list), calc(100vw - var(--w-nav) - 380px))
    0 minmax(0, 1fr);
  min-height: 0;
}

.studio-view__nav {
  min-height: 0;
  overflow: auto;
  padding: 14px 12px 24px max(12px, env(safe-area-inset-left, 0px));
  border-right: 1px solid var(--line);
  background: var(--surface-2);
}

.studio-view__list {
  min-height: 0;
  overflow: hidden;
  border-right: 1px solid var(--line);
}

.studio-view__detail {
  min-height: 0;
  overflow: hidden;
  padding-right: env(safe-area-inset-right, 0px);
}

.studio-view__scrim {
  display: none;
}

/* Fold button in the middle of the list splitter; the folded pane leaves the list the whole width. */
.studio-view__fold {
  display: grid;
  place-items: center;
  width: 22px;
  height: 44px;
  padding: 0;
  border: 1px solid var(--line-strong);
  border-radius: 999px;
  background: var(--surface);
  box-shadow: var(--shadow);
  color: var(--muted);
  cursor: pointer;
  font-size: 18px;
}

/* Sits on the detail side of the line, so it never covers the list's scrollbar. */
.studio-view__fold {
  transform: translateX(calc(50% + 2px));
}

.studio-view__fold:hover {
  border-color: var(--accent);
  color: var(--fg);
}

/* Folded, the round button gets a slim rail of its own at the right edge, so it covers nothing of
   the list (neither its scrollbar nor the counts at the right). */
.studio-view--detail-folded .studio-view__panes {
  grid-template-columns: var(--w-nav) 0 minmax(0, 1fr) var(--fold-rail) 0;
}

.studio-view--detail-folded .studio-view__detail {
  display: none;
}

/* Folded, the splitter sits at the right edge: no resizing, and the button stays inside. */
.studio-view--detail-folded .studio-view__splitter-list {
  pointer-events: none;
}

.studio-view--detail-folded .studio-view__fold {
  pointer-events: auto;
}

/* Tablet: categories become a drawer. */
@media (max-width: 1180px) {
  .studio-view__panes {
    grid-template-columns: min(var(--w-list), calc(100vw - 380px)) 0 minmax(0, 1fr);
  }

  .studio-view--detail-folded .studio-view__panes {
    grid-template-columns: minmax(0, 1fr) var(--fold-rail) 0;
  }

  .studio-view__nav {
    position: fixed;
    top: 0;
    bottom: 0;
    left: 0;
    z-index: 60;
    width: min(var(--w-nav), 86vw);
    padding-top: calc(14px + env(safe-area-inset-top, 0px));
    box-shadow: var(--shadow);
    transform: translateX(-102%);
    transition: transform 0.22s ease;
  }

  .studio-view--nav-open .studio-view__nav {
    transform: none;
  }

  .studio-view__splitter-nav {
    display: none;
  }

  .studio-view--nav-open .studio-view__scrim {
    display: block;
    position: fixed;
    inset: 0;
    z-index: 55;
    background: var(--scrim);
  }
}

/* Phone: list first, the detail slides in full screen. */
@media (max-width: 820px) {
  .studio-view__panes {
    grid-template-columns: minmax(0, 1fr);
  }

  .studio-view__list {
    border-right: 0;
  }

  .studio-view__splitter-list {
    display: none;
  }

  .studio-view__detail {
    position: fixed;
    inset: 0;
    z-index: 40;
    padding-top: env(safe-area-inset-top, 0px);
    background: var(--bg);
    transform: translateX(102%);
    transition: transform 0.24s ease;
  }

  .studio-view--detail-open .studio-view__detail {
    transform: none;
  }
}
</style>
