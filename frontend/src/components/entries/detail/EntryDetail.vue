<template>
  <section class="entry-detail">
    <div v-if="!entry" class="entry-detail__empty">
      <span class="mdi mdi-gesture-tap" />
      <p>{{ t("detail.empty") }}</p>
    </div>

    <template v-else>
      <!-- Header and tabs stay; only what is below them scrolls (owner's wish). -->
      <div class="entry-detail__top">
        <EntryDetailHeader
          :entry="entry"
          :is-technical-details-visible="isTechnicalDetailsVisible"
          :is-busy="isBusy"
          @back="emit('back')"
          @act="(action) => emit('act', action)"
          @toggle-favorite="emit('toggleFavorite')"
          @delete="emit('delete')"
          @enable="emit('save', { isDisabled: false })"
          :is-renaming="isRenaming"
          @start-rename="emit('startRename')"
          @duplicate="emit('duplicate')"
          @rename="(name) => emit('rename', name)"
          @cancel-rename="emit('cancelRename')"
        />
      </div>

      <div class="entry-detail__scroll">
        <CheckupBanner
          v-if="findings.length"
          :findings="findings"
          :has-flow="hasFlow"
          :is-busy="isBusy"
          @show-flow="selectTab(DETAIL_TAB.flow)"
          @show-history="selectTab(DETAIL_TAB.history)"
          @turn-off="emit('act', ENTRY_ACTION.turnOff)"
          @delete="emit('delete')"
          @ignore="(key) => emit('ignoreFinding', key)"
        />

        <EntryDetailTabs
          :tabs="tabs"
          :active-tab="activeTab"
          :dependency-count="dependencyCount"
          @select="selectTab"
        />

        <div v-if="hasFlow && activeTab === DETAIL_TAB.flow" class="entry-detail__body">
          <EntryFlowTab
            :entry="entry"
            :display-flow="displayFlow"
            :catalog="catalog"
            :is-technical-details-visible="isTechnicalDetailsVisible"
            @to-history="selectTab(DETAIL_TAB.history)"
          />
        </div>

        <div v-else-if="activeTab === DETAIL_TAB.history" class="entry-detail__body">
          <RunHistoryView
            :entry="entry"
            :flow="displayFlow"
            :is-technical-details-visible="isTechnicalDetailsVisible"
            :is-editable="editorStore.flow?.isEditable ?? false"
            :has-unsaved-changes="editorStore.isDirty"
            @show-on-flow="showRunOnFlow"
          />
        </div>

        <div v-else-if="activeTab === DETAIL_TAB.versions" class="entry-detail__body">
          <VersionsView :entry="entry" />
        </div>

        <div v-else-if="activeTab === DETAIL_TAB.states" class="entry-detail__body">
          <SceneEditorView
            :entry="entry"
            :is-technical-details-visible="isTechnicalDetailsVisible"
          />
        </div>

        <div v-else-if="activeTab === DETAIL_TAB.settings" class="entry-detail__body">
          <HelperSettingsView
            :entry="entry"
            :is-technical-details-visible="isTechnicalDetailsVisible"
          />
        </div>

        <div v-else-if="activeTab === DETAIL_TAB.dependencies" class="entry-detail__body">
          <DependencyView
            :entry="entry"
            :has-finding-banner="hasProblemFinding"
            :is-technical-details-visible="isTechnicalDetailsVisible"
            @open="(id) => emit('open', id)"
          />
        </div>

        <div v-else class="entry-detail__body">
          <EntryProperties
            :entry="entry"
            :all-category-paths="allCategoryPaths"
            :areas="areas"
            :labels="labels"
            :is-busy="isBusy"
            :is-technical-details-visible="isTechnicalDetailsVisible"
            @move="(path) => emit('move', path)"
            @save="(changes) => emit('save', changes)"
            @save-note="(note) => emit('saveNote', note)"
            @ask-disable="emit('askDisable')"
            @rename-id="(preset) => emit('renameId', preset)"
          />
        </div>
      </div>

      <!-- The save footer: the flow's here, helper settings and scenes teleport theirs in. -->
      <div id="entry-detail-footer" class="entry-detail__footer">
        <SaveFooter
          v-if="hasFlow && editorStore.isDirty"
          :is-saving="editorStore.isSaving"
          :note="editorStore.hasRemoteChange ? t('save.remoteChanged') : null"
          @save="emit('saveFlow')"
          @discard="editorStore.discard()"
        />
        <VersionSaveNote v-if="!editorStore.isDirty" :entity-id="entry.entityId" />
      </div>
    </template>
  </section>
</template>

<script setup lang="ts">
import { computed, toRef } from "vue";
import { useI18n } from "vue-i18n";

import { DETAIL_TAB, ENTRY_ACTION, type EntryAction } from "@/constants/entries";
import CheckupBanner from "@/components/checkup/CheckupBanner.vue";
import DependencyView from "@/components/dependencies/DependencyView.vue";
import RunHistoryView from "@/components/history/RunHistoryView.vue";
import SaveFooter from "@/components/common/SaveFooter.vue";
import HelperSettingsView from "@/components/helpers/HelperSettingsView.vue";
import SceneEditorView from "@/components/scenes/SceneEditorView.vue";
import VersionSaveNote from "@/components/versions/VersionSaveNote.vue";
import VersionsView from "@/components/versions/VersionsView.vue";
import { useDetailTabs } from "@/composables/useDetailTabs";
import type { CheckupFinding } from "@/services/checkupService";
import { useEditorStore } from "@/stores/editorStore";
import type { DisplayFlow, EditorCatalog } from "@/types/editor";
import type { Area, Entry, EntryChanges, Label } from "@/types/entry";

import EntryDetailHeader from "./EntryDetailHeader.vue";
import EntryDetailTabs from "./EntryDetailTabs.vue";
import EntryFlowTab from "./EntryFlowTab.vue";
import EntryProperties from "./EntryProperties.vue";

const props = defineProps<{
  /** The title is being renamed in place. */
  isRenaming: boolean;
  entry: Entry | null;
  isTechnicalDetailsVisible: boolean;
  /** All folder paths, as suggestions for moving. */
  allCategoryPaths: string[];
  areas: Area[];
  labels: Label[];
  /** A request is running; the controls are locked meanwhile. */
  isBusy: boolean;
  /** The flow of the open automation or script; null while loading or for other kinds. */
  displayFlow: DisplayFlow | null;
  /** Block types for adding; null until HA sent them. */
  catalog: EditorCatalog | null;
  /** Check-up findings for this entry, shown above the tabs. */
  findings: CheckupFinding[];
}>();

const emit = defineEmits<{
  back: [];
  move: [path: string | null];
  save: [changes: EntryChanges];
  act: [action: EntryAction];
  toggleFavorite: [];
  saveNote: [note: string];
  delete: [];
  saveFlow: [];
  ignoreFinding: [key: string];
  /** "Deaktivieren?" asks first, because flows may still use the entry. */
  askDisable: [];
  startRename: [];
  duplicate: [];
  rename: [name: string];
  cancelRename: [];
  /** "Entity-ID ändern"; `preset` is a suggested ID or null. */
  renameId: [preset: string | null];
  /** Open another entry (from the dependencies). */
  open: [entityId: string];
}>();

const { t } = useI18n();

const editorStore = useEditorStore();

const { hasFlow, tabs, activeTab, selectTab, showRunOnFlow, dependencyCount } = useDetailTabs({
  entry: toRef(props, "entry"),
});

/** Gone or unavailable things are already named in the check-up banner. */
const hasProblemFinding = computed(() =>
  props.findings.some((finding) => finding.kind === "gone" || finding.kind === "unavailable"),
);
</script>

<style scoped>
/* Header and tabs on top, the content scrolls in between, the save footer at the bottom. */
.entry-detail {
  display: flex;
  flex-direction: column;
  height: 100%;
  overflow: hidden;
}

.entry-detail__top,
.entry-detail__footer {
  flex: none;
}

.entry-detail__scroll {
  flex: 1;
  min-height: 0;
  overflow: auto;
}

.entry-detail__empty {
  display: grid;
  place-content: center;
  height: 100%;
  padding: 40px;
  color: var(--muted);
  text-align: center;
}

.entry-detail__empty .mdi {
  color: var(--faint);
  font-size: 34px;
}

.entry-detail__body {
  max-width: 980px;
  padding: 22px 28px 60px;
}

@media (max-width: 820px) {
  .entry-detail__body {
    padding-left: max(16px, env(safe-area-inset-left, 0px));
    padding-right: max(16px, env(safe-area-inset-right, 0px));
  }
}
</style>
