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
          @show-flow="selectTab(TAB.flow)"
          @show-history="selectTab(TAB.history)"
          @turn-off="emit('act', ENTRY_ACTION.turnOff)"
          @delete="emit('delete')"
          @ignore="(key) => emit('ignoreFinding', key)"
        />

        <div class="entry-detail__tabs" role="tablist">
          <button
            v-for="tab in tabs"
            :key="tab"
            type="button"
            role="tab"
            class="entry-detail__tab"
            :class="{ 'entry-detail__tab--active': activeTab === tab }"
            :aria-selected="activeTab === tab"
            @click="selectTab(tab)"
          >
            {{ t(`detail.tabs.${tab}`) }}
            <span v-if="tab === TAB.dependencies && dependencyCount" class="entry-detail__badge">
              {{ dependencyCount }}
            </span>
          </button>
        </div>

        <div v-if="hasFlow && activeTab === TAB.flow" class="entry-detail__body">
          <RunOverlayBar
            v-if="shownRun"
            :run="shownRun"
            @to-history="selectTab(TAB.history)"
            @hide="traces.showOnFlow(null)"
          />
          <FlowView
            :entity-id="entry.entityId"
            :flow="displayFlow"
            :kind="entry.kind === 'script' ? 'script' : 'automation'"
            :is-loading="isFlowLoading"
            :has-error="hasFlowError"
            :is-editable="isFlowEditable"
            :is-technical-details-visible="isTechnicalDetailsVisible"
            :catalog="catalog"
            :area-id="entry.area?.areaId ?? null"
            :run-states="shownRunStates"
            @change="(change) => emit('changeFlow', change)"
          />
        </div>

        <div v-else-if="activeTab === TAB.history" class="entry-detail__body">
          <RunHistoryView
            :entry="entry"
            :flow="displayFlow"
            :is-technical-details-visible="isTechnicalDetailsVisible"
            :is-editable="isFlowEditable"
            :has-unsaved-changes="hasUnsavedChanges"
            @show-on-flow="showOnFlow"
          />
        </div>

        <div v-else-if="activeTab === TAB.states" class="entry-detail__body">
          <SceneEditorView
            :entry="entry"
            :is-technical-details-visible="isTechnicalDetailsVisible"
          />
        </div>

        <div v-else-if="activeTab === TAB.settings" class="entry-detail__body">
          <HelperSettingsView
            :entry="entry"
            :is-technical-details-visible="isTechnicalDetailsVisible"
          />
        </div>

        <div v-else-if="activeTab === TAB.dependencies" class="entry-detail__body">
          <DependencyView
            :entry="entry"
            :has-finding-banner="hasProblemFinding"
            :is-technical-details-visible="isTechnicalDetailsVisible"
            @open="(id) => emit('open', id)"
          />
        </div>

        <div v-else class="entry-detail__body">
          <p v-if="!entry.isInRegistry" class="entry-detail__hint">
            <span class="mdi mdi-information-outline" /> {{ t("detail.notInRegistry") }}
          </p>

          <template v-else>
            <CategoryMoveField
              class="entry-detail__section"
              :current-path="entry.categoryPath"
              :all-paths="allCategoryPaths"
              :is-disabled="isBusy"
              @move="(path) => emit('move', path)"
            />

            <section class="entry-detail__section">
              <h3>{{ t("detail.identity") }}</h3>
              <EntryEditForm
                :entry="entry"
                :areas="areas"
                :labels="labels"
                :fallback-icon="ENTRY_KIND_ICON[entry.kind]"
                :is-busy="isBusy"
                @save="(changes) => emit('save', changes)"
              />
              <div class="entry-detail__card entry-detail__entity-id">
                <EntityIdField
                  :entry="entry"
                  :is-busy="isBusy"
                  @rename="(preset) => emit('renameId', preset)"
                />
              </div>
            </section>

            <section class="entry-detail__section">
              <h3>{{ t("visibility.title") }}</h3>
              <div class="entry-detail__card">
                <EntryVisibilityForm
                  :entry="entry"
                  :is-busy="isBusy"
                  @save="(changes) => emit('save', changes)"
                  @ask-disable="emit('askDisable')"
                />
              </div>
            </section>
          </template>

          <section class="entry-detail__section">
            <h3>{{ t("detail.own") }}</h3>
            <div class="entry-detail__card entry-detail__card--padded">
              <NoteField :note="entry.note" @save="(note) => emit('saveNote', note)" />
            </div>
          </section>

          <section class="entry-detail__section">
            <h3>{{ t("detail.status") }}</h3>
            <dl class="entry-detail__card">
              <div v-for="row in statusRows" :key="row.label" class="entry-detail__row">
                <dt>{{ row.label }}</dt>
                <dd :class="{ mono: row.isMono }">{{ row.value }}</dd>
              </div>
            </dl>
          </section>
        </div>
      </div>

      <!-- The save footer: the flow's here, helper settings and scenes teleport theirs in. -->
      <div id="entry-detail-footer" class="entry-detail__footer">
        <SaveFooter
          v-if="hasFlow && hasUnsavedChanges"
          :is-saving="isFlowSaving"
          :note="hasRemoteChange ? t('flow.remoteChanged') : null"
          @save="emit('saveFlow')"
          @discard="emit('discardFlow')"
        />
      </div>
    </template>
  </section>
</template>

<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { useI18n } from "vue-i18n";

import { ENTRY_ACTION, ENTRY_KIND_ICON, type EntryAction } from "@/constants/entries";
import CheckupBanner from "@/components/checkup/CheckupBanner.vue";
import DependencyView from "@/components/dependencies/DependencyView.vue";
import RunHistoryView from "@/components/history/RunHistoryView.vue";
import RunOverlayBar from "@/components/history/RunOverlayBar.vue";
import SaveFooter from "@/components/common/SaveFooter.vue";
import FlowView from "@/components/flow/FlowView.vue";
import type { CheckupFinding } from "@/services/checkupService";
import { useDependenciesStore } from "@/stores/dependenciesStore";
import { useTracesStore } from "@/stores/tracesStore";
import { startTab } from "@/utils/detailTab";
import { runStatesFor } from "@/utils/runStates";
import type { DisplayFlow, EditorCatalog, FlowChange } from "@/types/editor";
import type { Area, Entry, EntryChanges, Label } from "@/types/entry";

import CategoryMoveField from "./CategoryMoveField.vue";
import EntryDetailHeader from "./EntryDetailHeader.vue";
import EntityIdField from "./EntityIdField.vue";
import EntryEditForm from "./EntryEditForm.vue";
import EntryVisibilityForm from "./EntryVisibilityForm.vue";
import HelperSettingsView from "@/components/helpers/HelperSettingsView.vue";
import SceneEditorView from "@/components/scenes/SceneEditorView.vue";
import NoteField from "./NoteField.vue";

type DetailRow = { label: string; value: string; isMono?: boolean };

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
  isFlowLoading: boolean;
  hasFlowError: boolean;
  /** Block types for adding; null until HA sent them. */
  catalog: EditorCatalog | null;
  /** The flow can be saved to HA; otherwise it is shown read-only. */
  isFlowEditable: boolean;
  hasUnsavedChanges: boolean;
  hasRemoteChange: boolean;
  isFlowSaving: boolean;
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
  changeFlow: [change: FlowChange];
  saveFlow: [];
  discardFlow: [];
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

const TAB = {
  flow: "flow",
  settings: "settings",
  states: "states",
  properties: "properties",
  history: "history",
  dependencies: "dependencies",
} as const;
type Tab = (typeof TAB)[keyof typeof TAB];
/** Kinds that have a flow (triggers, conditions, actions) to show. */
const FLOW_KINDS = ["automation", "script"];

const deps = useDependenciesStore();
const traces = useTracesStore();

/** The run "Im Ablauf zeigen" put on the flow, while it belongs to this entry. */
const shownRun = computed(() => {
  const history = traces.current;
  if (!props.entry || history?.entityId !== props.entry.entityId) return null;
  return history.runs.find((run) => run.runId === traces.shownRunId) ?? null;
});
const shownRunStates = computed(() =>
  shownRun.value && props.displayFlow ? runStatesFor(shownRun.value, props.displayFlow) : null,
);

function showOnFlow(runId: string): void {
  traces.showOnFlow(runId);
  selectTab(TAB.flow);
}
const hasFlow = computed(() => FLOW_KINDS.includes(props.entry?.kind ?? ""));
const isHelper = computed(() => props.entry?.kind === "helper");
const tabs = computed((): Tab[] => {
  if (hasFlow.value) return [TAB.flow, TAB.properties, TAB.history, TAB.dependencies];
  if (isHelper.value) return [TAB.settings, TAB.properties, TAB.dependencies];
  if (props.entry?.kind === "scene") return [TAB.states, TAB.properties, TAB.dependencies];
  return [TAB.properties, TAB.dependencies];
});
const activeTab = ref<Tab>(TAB.flow);
/**
 * The tab the user picked last. It stays when the next entry lacks it, so clicking from an
 * automation's history over a helper to the next automation lands on the history again.
 */
const pickedTab = ref<Tab | null>(null);

function selectTab(tab: Tab): void {
  activeTab.value = tab;
  pickedTab.value = tab;
}

// A newly opened entry starts on the picked tab if it has it (else its flow, a helper's
// settings or its properties) and loads its dependencies.
watch(
  () => props.entry?.entityId,
  (entityId) => {
    activeTab.value = startTab(tabs.value, pickedTab.value) ?? TAB.properties;
    traces.showOnFlow(null);
    void deps.load(entityId ?? null);
  },
  { immediate: true },
);

/** Uses and users together, for the tab badge. */
const dependencyCount = computed(() => {
  const current = deps.current;
  if (!current || current.entityId !== props.entry?.entityId) return 0;
  return current.uses.length + current.usedBy.length;
});

/** Gone or unavailable things are already named in the check-up banner. */
const hasProblemFinding = computed(() =>
  props.findings.some((finding) => finding.kind === "gone" || finding.kind === "unavailable"),
);

const yesNo = (value: boolean): string => (value ? t("detail.yes") : t("detail.no"));
const orNone = (value: string | null): string => value || t("detail.none");

const statusRows = computed((): DetailRow[] => {
  const entry = props.entry;

  if (!entry) return [];

  const rows: DetailRow[] = [
    { label: t("detail.state"), value: orNone(entry.state) },
    { label: t("detail.enabled"), value: yesNo(!entry.isDisabled) },
    { label: t("detail.hidden"), value: yesNo(entry.isHidden) },
  ];

  if (props.isTechnicalDetailsVisible) {
    rows.push({ label: t("detail.entityId"), value: entry.entityId, isMono: true });
    rows.push({ label: t("detail.domain"), value: entry.domain, isMono: true });
  }

  return rows;
});
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

.entry-detail__tabs {
  display: flex;
  gap: 2px;
  overflow-x: auto;
  padding: 0 28px;
  scrollbar-width: none;
  border-bottom: 1px solid var(--line);
  background: var(--surface);
}

.entry-detail__tab {
  flex: none;
  padding: 10px 12px 11px;
  white-space: nowrap;
  border: 0;
  border-bottom: 2px solid transparent;
  background: none;
  color: var(--muted);
  cursor: pointer;
  font-weight: 600;
}

.entry-detail__tab:hover {
  color: var(--fg);
}

.entry-detail__badge {
  margin-left: 6px;
  padding: 1px 6px;
  border-radius: 999px;
  background: var(--sunken);
  color: var(--muted);
  font-size: 11.5px;
  font-variant-numeric: tabular-nums;
}

.entry-detail__tab--active {
  border-bottom-color: var(--fg);
  color: var(--fg);
}

.entry-detail__body {
  max-width: 980px;
  padding: 22px 28px 60px;
}

.entry-detail__hint {
  display: flex;
  gap: 8px;
  padding: 10px 12px;
  border-radius: var(--radius-md);
  background: var(--warn-soft);
  color: var(--warn);
}

.entry-detail__section {
  margin-bottom: 24px;
}

.entry-detail__section h3 {
  margin: 0 0 10px;
  font: 700 15px/1.2 var(--font-display);
}

.entry-detail__card {
  margin: 0;
  border: 1px solid var(--line);
  border-radius: 12px;
  background: var(--surface);
}

.entry-detail__card--padded {
  padding: 16px;
}

.entry-detail__row {
  display: grid;
  grid-template-columns: minmax(150px, 220px) minmax(0, 1fr);
  gap: 16px;
  padding: 12px 16px;
  border-top: 1px solid var(--line);
}

.entry-detail__row:first-child {
  border-top: 0;
}

.entry-detail__row dt {
  font-weight: 600;
}

.entry-detail__row dd {
  margin: 0;
  overflow-wrap: anywhere;
}

@media (max-width: 820px) {
  .entry-detail__body {
    padding-left: max(16px, env(safe-area-inset-left, 0px));
    padding-right: max(16px, env(safe-area-inset-right, 0px));
  }

  .entry-detail__row {
    grid-template-columns: minmax(0, 1fr);
    gap: 4px;
  }
}

.entry-detail__entity-id {
  margin-top: 10px;
}
</style>
