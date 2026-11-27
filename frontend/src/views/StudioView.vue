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
    <AppTopBar :is-live="isLive" />

    <div v-if="entriesStore.hasLoadError" class="studio-view__error" role="alert">
      <span class="mdi mdi-lan-disconnect" />
      {{ t("errors.loadFailed") }}
      <button class="btn" type="button" @click="entriesStore.load()">
        {{ t("errors.retry") }}
      </button>
    </div>

    <main class="studio-view__panes">
      <aside class="studio-view__nav">
        <StudioNav
          :data="data"
          :actions="actions"
          :create="create"
          :area-actions="areaActions"
          :entity-move="entityMove"
          @select="selectCategory"
          @pick-color="(path) => (colorPath = path)"
        />
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
        <StudioList
          :data="data"
          :actions="actions"
          :create="create"
          :entry-actions="entryActions"
          :entity-move="entityMove"
          :entity-menu="entityMenu"
          :unsaved-ids="unsavedIds"
          @select="selectEntry"
          @open-nav="isNavOpen = true"
          @label-checked="(bar) => (bulkLabelField = bulkLabelField ? null : bar)"
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
        <DetailFoldButton />
      </PaneSplitter>

      <div class="studio-view__detail">
        <StudioDetail
          :data="data"
          :actions="actions"
          :entry-actions="entryActions"
          :display-flow="displayFlow"
          :catalog="catalog"
          @back="isDetailOpen = false"
          @select="selectEntry"
        />
      </div>
    </main>

    <div class="studio-view__scrim" @click="isNavOpen = false" />

    <BulkLabelPicker
      v-if="bulkLabelField && studio.checkedIds.size > 0"
      :field="bulkLabelField"
      @close="bulkLabelField = null"
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
      :entity-move="entityMove"
      @close-color="colorPath = null"
      @created="selectEntry"
      @folder-created="selectCategory"
      @tidied="onTidied"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { useI18n } from "vue-i18n";

import QuickMenu from "@/components/common/QuickMenu.vue";
import BulkLabelPicker from "@/components/labels/BulkLabelPicker.vue";
import AppTopBar from "@/components/layout/AppTopBar.vue";
import DetailFoldButton from "@/components/layout/DetailFoldButton.vue";
import PaneSplitter from "@/components/layout/PaneSplitter.vue";
import StudioDetail from "@/components/layout/StudioDetail.vue";
import StudioDialogs from "@/components/layout/StudioDialogs.vue";
import StudioList from "@/components/layout/StudioList.vue";
import StudioNav from "@/components/layout/StudioNav.vue";
import { useAreaActions } from "@/composables/actions/useAreaActions";
import { useCategoryActions } from "@/composables/actions/useCategoryActions";
import { useCreateActions } from "@/composables/actions/useCreateActions";
import { useEntityBulkMove } from "@/composables/actions/useEntityBulkMove";
import { useEntryActions } from "@/composables/actions/useEntryActions";
import { useDisplayFlow } from "@/composables/flow/useDisplayFlow";
import { useEntityMenu } from "@/composables/useEntityMenu";
import { useLiveUpdates } from "@/composables/useLiveUpdates";
import { useStudioData } from "@/composables/studio/useStudioData";
import { useStudioLoading } from "@/composables/studio/useStudioLoading";
import { useStudioSelection } from "@/composables/studio/useStudioSelection";
import { useStudioWindowEvents } from "@/composables/studio/useStudioWindowEvents";
import { NAV_MODE } from "@/constants/entries";
import { PANE, PANE_WIDTH_LIMITS } from "@/constants/layout";
import { useDraftsStore } from "@/stores/draftsStore";
import { useEditorStore } from "@/stores/editorStore";
import { useEntriesStore } from "@/stores/entriesStore";
import { useLayoutStore } from "@/stores/layoutStore";
import { useStudioStore } from "@/stores/studioStore";

const { t } = useI18n();
const entriesStore = useEntriesStore();
const layout = useLayoutStore();
const studio = useStudioStore();
const data = useStudioData();
const actions = useCategoryActions();
const create = useCreateActions();
const entryActions = useEntryActions();
const { isLive } = useLiveUpdates();
const editorStore = useEditorStore();
const draftsStore = useDraftsStore();
/** Several ticked entities into a folder, with its own folder dialog. */
const entityMove = useEntityBulkMove();
const areaActions = useAreaActions();

// "Alles rückgängig" of a scene only reaches back while that scene stays open.
watch(
  () => data.selectedEntry.value?.entityId,
  (entityId) => draftsStore.forgetUndo(entityId),
  { immediate: true },
);

const { displayFlow, catalog } = useDisplayFlow({ entry: data.selectedEntry });

/** Entries with unsaved edits: flows, helper settings and scenes. */
const unsavedIds = computed(() => new Set([...editorStore.unsavedIds, ...draftsStore.unsavedIds]));

useStudioWindowEvents({ entry: data.selectedEntry, unsavedIds });

const { isNavOpen, isDetailOpen, selectCategory, selectEntry, showDetail } = useStudioSelection();
/** The folder whose color dialog is open; null when closed. */
const colorPath = ref<string | null>(null);
/** The bulk bar while its label picker is open; null when closed. */
const bulkLabelField = ref<HTMLElement | null>(null);

const navWidth = computed({
  get: () => layout.paneWidths.nav,
  set: (width: number) => layout.setPaneWidth({ pane: PANE.nav, width }),
});
const listWidth = computed({
  get: () => layout.paneWidths.list,
  set: (width: number) => layout.setPaneWidth({ pane: PANE.list, width }),
});

/** After sorting by area the new folders are what the user wants to see. */
function onTidied(path: string): void {
  layout.navMode = NAV_MODE.folders;
  selectCategory(path);
}

/** A plain entity was clicked (or tapped): where it can go in the open flow, and its folder. */
const entityMenu = useEntityMenu({
  displayFlow,
  flowId: computed(() => editorStore.flow?.entityId ?? null),
  flowKind: computed(() => editorStore.flow?.kind ?? null),
  isFlowEditable: computed(
    () => editorStore.flow?.isEditable === true && displayFlow.value !== null,
  ),
  isSceneOpen: computed(() => data.selectedEntry.value?.kind === "scene"),
  catalog,
  applyChange: (change) => editorStore.applyChange(change),
  showDetail,
  startMoveEntity: (entity) => actions.startMoveEntity(entity),
});

useStudioLoading();
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

/* Folded, the round button gets a slim rail of its own at the right edge, so it covers nothing of
   the list (neither its scrollbar nor the counts at the right). */
.studio-view--detail-folded .studio-view__panes {
  grid-template-columns: var(--w-nav) 0 minmax(0, 1fr) var(--fold-rail) 0;
}

.studio-view--detail-folded .studio-view__detail {
  display: none;
}

/*
 * Folded, the splitter sits at the right edge: no resizing, and the button stays inside (it keeps
 * taking clicks, see DetailFoldButton).
 */
.studio-view--detail-folded .studio-view__splitter-list {
  pointer-events: none;
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
