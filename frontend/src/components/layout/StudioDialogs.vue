<template>
  <RenameCategoryDialog
    v-if="actions.renamingPath.value"
    :folder-path="actions.renamingPath.value"
    :all-paths="allPaths"
    :is-busy="actions.isBusy.value"
    @cancel="actions.cancelRename"
    @confirm="actions.confirmRename"
  />
  <AreaDialog
    v-if="areas.draft"
    :area="areas.draft.area"
    :areas="lookups.areas"
    :is-busy="areaActions.isBusy.value"
    @cancel="areas.closeDraft"
    @confirm="areaActions.saveDraft"
  />
  <ConfirmDialog
    v-if="areas.deleting"
    :title="t('areas.deleteDialog.title', { name: areas.deleting.name })"
    :text="deleteAreaText"
    :confirm-label="t('areas.deleteDialog.confirm')"
    :is-busy="areaActions.isBusy.value"
    @cancel="areas.closeDelete"
    @confirm="areaActions.confirmDelete"
  />
  <!-- Hidden while a new area is being created from it; it comes back with that area picked. -->
  <SetAreaDialog
    v-if="areas.settingIds && !areas.draft"
    :count="areas.settingIds.length"
    :areas="lookups.areas"
    :initial-area-id="setAreaPreset"
    :is-busy="areaActions.isBusy.value"
    @cancel="closeSetArea"
    @confirm="setArea"
    @new-area="areas.startCreate((area) => (setAreaPreset = area.areaId))"
  />
  <AreaTidyDialog
    v-if="actions.isAreaTidyOpen.value"
    :entries="entriesStore.entries"
    :links-of="entryAreas.linksOf"
    :folder-paths="allPaths"
    :is-busy="actions.isBusy.value"
    @cancel="actions.cancelAreaTidy"
    @confirm="confirmAreaTidy"
  />
  <LabelDeleteDialog
    v-if="labelActions.deleting.value"
    :label="labelActions.deleting.value.label"
    :usage="labelActions.deleting.value.usage"
    :is-busy="labelActions.isBusy.value"
    @confirm="labelActions.confirmDelete"
    @cancel="labelActions.cancelDelete"
    @more="showLabelsTopic"
  />
  <MoveEntriesDialog
    v-if="actions.movingIds.value"
    :count="actions.movingIds.value.length"
    :all-paths="allPaths"
    :is-busy="actions.isBusy.value"
    @cancel="actions.cancelMoveMany"
    @confirm="(path) => actions.moveEntries(actions.movingIds.value ?? [], path)"
  />
  <MoveEntriesDialog
    v-if="actions.movingEntity.value"
    :count="1"
    :title="t('entityRow.moveTitle', { name: actions.movingEntity.value.name })"
    :all-paths="allPaths"
    :is-busy="actions.isBusy.value"
    @cancel="actions.cancelMoveEntity"
    @confirm="(path) => actions.moveEntity(actions.movingEntity.value?.entityId ?? '', path)"
  />
  <NewFolderDialog
    v-if="create.folderDraft.value"
    :parent="create.folderDraft.value.parent"
    :all-paths="allPaths"
    :is-busy="create.isBusy.value"
    :is-technical-details-visible="settings.isTechnicalDetailsVisible"
    @cancel="create.cancelFolder"
    @confirm="createFolder"
  />
  <NewHelperDialog
    v-if="create.isHelperDialogOpen.value"
    :initial-folder="currentFolder"
    :all-paths="allPaths"
    :is-busy="create.isBusy.value"
    @cancel="create.closeHelperDialog"
    @confirm="createHelper"
  />
  <NewFlowDialog
    v-if="create.newFlowKind.value"
    :kind="create.newFlowKind.value"
    :initial-folder="currentFolder"
    :all-paths="allPaths"
    :is-busy="create.isBusy.value"
    @cancel="create.closeFlowDialog"
    @confirm="createFlow"
  />
  <ConfirmDialog
    v-if="entryActions.deletingEntry.value"
    :title="t(`delete.title.${entryActions.deletingEntry.value.kind}`)"
    :text="
      t(`delete.text.${entryActions.deletingEntry.value.kind}`, {
        name: entryActions.deletingEntry.value.name,
      })
    "
    :confirm-label="deleteUsers.length ? t('deps.deleteAnyway') : t('delete.confirm')"
    :is-busy="entryActions.isBusy.value"
    @cancel="entryActions.cancelDelete"
    @confirm="entryActions.confirmDelete"
  >
    <template v-if="deleteUsers.length">
      <p class="studio-dialogs__warn">{{ t("deps.deleteWarning") }}</p>
      <div class="studio-dialogs__users">
        <DependencyUserRow
          v-for="user in deleteUsers"
          :key="user.entityId"
          :user="user"
          :entry="entriesStore.entries.find((item) => item.entityId === user.entityId) ?? null"
          is-plain
        />
      </div>
    </template>
  </ConfirmDialog>
  <ConfirmDialog
    v-if="entryActions.disablingEntry.value"
    :title="t('visibility.disableTitle', { name: entryActions.disablingEntry.value.name })"
    :text="
      t(
        entryActions.disablingEntry.value.kind === 'automation'
          ? 'visibility.disableTextAutomation'
          : 'visibility.disableText',
      )
    "
    :confirm-label="t('visibility.disableConfirm')"
    :is-busy="entryActions.isBusy.value"
    @cancel="entryActions.cancelDisable"
    @confirm="entryActions.confirmDisable"
  >
    <template v-if="disableUsers.length">
      <p class="studio-dialogs__warn">{{ t("visibility.disableWarning") }}</p>
      <div class="studio-dialogs__users">
        <DependencyUserRow
          v-for="user in disableUsers"
          :key="user.entityId"
          :user="user"
          :entry="entriesStore.entries.find((item) => item.entityId === user.entityId) ?? null"
          is-plain
        />
      </div>
    </template>
  </ConfirmDialog>
  <RenameEntityDialog
    v-if="entryActions.renamingId.value"
    :entry="entryActions.renamingId.value.entry"
    :preset="entryActions.renamingId.value.preset"
    :taken-ids="takenIds"
    :is-busy="entryActions.isBusy.value"
    @cancel="entryActions.cancelRenameId"
    @confirm="entryActions.confirmRenameId"
  />
  <FolderColorDialog
    v-if="colorPath"
    :path="colorPath"
    :current="foldersStore.colors[colorPath] ?? null"
    @cancel="emit('closeColor')"
    @pick="pickColor"
  />
  <CleanupDialog
    v-if="cleanup.isOpen"
    :all-paths="allPaths"
    @close="cleanup.close()"
    @applied="onCleanedUp"
  />
  <SettingsWindow v-if="settingsWindow.isOpen" @tidy="actions.startAreaTidy" />
  <EntitySortingWindow v-if="sorting.isOpen" />
  <AiPlanDialog
    v-if="ai.reviewPlan"
    :key="ai.reviewPlan.id"
    :plan="ai.reviewPlan"
    :all-paths="allPaths"
    @applied="onPlanApplied"
  />
  <ToastHost />
</template>

<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { useI18n } from "vue-i18n";

import AiPlanDialog from "@/components/ai/AiPlanDialog.vue";
import AreaDialog from "@/components/areas/AreaDialog.vue";
import AreaTidyDialog from "@/components/areas/AreaTidyDialog.vue";
import SetAreaDialog from "@/components/areas/SetAreaDialog.vue";
import CleanupDialog from "@/components/cleanup/CleanupDialog.vue";
import EntitySortingWindow from "@/components/entitySorting/EntitySortingWindow.vue";
import FolderColorDialog from "@/components/categories/FolderColorDialog.vue";
import NewFolderDialog from "@/components/categories/NewFolderDialog.vue";
import RenameCategoryDialog from "@/components/categories/RenameCategoryDialog.vue";
import MoveEntriesDialog from "@/components/entries/MoveEntriesDialog.vue";
import LabelDeleteDialog from "@/components/labels/LabelDeleteDialog.vue";
import { useLabelActions } from "@/composables/actions/useLabelActions";
import RenameEntityDialog from "@/components/entries/RenameEntityDialog.vue";
import ConfirmDialog from "@/components/common/ConfirmDialog.vue";
import DependencyUserRow from "@/components/dependencies/DependencyUserRow.vue";
import ToastHost from "@/components/common/ToastHost.vue";
import NewFlowDialog from "@/components/flow/NewFlowDialog.vue";
import NewHelperDialog from "@/components/helpers/NewHelperDialog.vue";
import SettingsWindow from "@/components/settings/SettingsWindow.vue";
import type { useAreaActions } from "@/composables/actions/useAreaActions";
import type { useCategoryActions } from "@/composables/actions/useCategoryActions";
import type { useCreateActions } from "@/composables/actions/useCreateActions";
import type { useEntryActions } from "@/composables/actions/useEntryActions";
import type { NewFlow } from "@/services/flowsService";
import type { NewHelper } from "@/services/helpersService";
import { useAiStore } from "@/stores/aiStore";
import { useAreasStore } from "@/stores/areasStore";
import { useCleanupStore } from "@/stores/cleanupStore";
import { useEntitySortingStore } from "@/stores/entitySortingStore";
import { useDependenciesStore } from "@/stores/dependenciesStore";
import { useEntriesStore } from "@/stores/entriesStore";
import { useEntryAreasStore } from "@/stores/entryAreasStore";
import { useFoldersStore } from "@/stores/foldersStore";
import { useLookupsStore } from "@/stores/lookupsStore";
import { useSettingsStore } from "@/stores/settingsStore";
import { useSettingsWindowStore } from "@/stores/settingsWindowStore";
import { useToastStore } from "@/stores/toastStore";

/** All dialogs and toasts of the studio page, kept out of the page to keep it readable. */
const props = defineProps<{
  allPaths: string[];
  currentFolder: string | null;
  /** The folder whose color dialog is open; null when closed. */
  colorPath: string | null;
  actions: ReturnType<typeof useCategoryActions>;
  create: ReturnType<typeof useCreateActions>;
  entryActions: ReturnType<typeof useEntryActions>;
  areaActions: ReturnType<typeof useAreaActions>;
}>();

const labelActions = useLabelActions();

/** "Mehr dazu" in the delete dialog: the topic about labels in "Gut zu wissen". */
function showLabelsTopic(): void {
  labelActions.cancelDelete();
  settingsWindow.showTopic("labels");
}

const emit = defineEmits<{
  closeColor: [];
  /** A new helper, automation or script exists; the page opens it. */
  created: [entityId: string];
  /** A new folder exists; the page opens it. */
  folderCreated: [path: string];
  /** Entries were sorted by area; the page opens the first folder. */
  tidied: [path: string];
}>();

const { t } = useI18n();
const foldersStore = useFoldersStore();
const cleanup = useCleanupStore();
const sorting = useEntitySortingStore();
const entriesStore = useEntriesStore();
const toasts = useToastStore();
const ai = useAiStore();
const dependencies = useDependenciesStore();
const entryAreas = useEntryAreasStore();
const areas = useAreasStore();
const lookups = useLookupsStore();
const settings = useSettingsStore();
const settingsWindow = useSettingsWindowStore();

/** An area created from "Bereich setzen" is picked there when it comes back. */
const setAreaPreset = ref<string | null>(null);

function closeSetArea(): void {
  setAreaPreset.value = null;
  areas.closeSetArea();
}

async function setArea(areaId: string | null): Promise<void> {
  await props.areaActions.setOwnArea(areas.settingIds ?? [], areaId);
  setAreaPreset.value = null;
}

// The delete warning counts devices; the entity list knows them.
watch(
  () => areas.deleting,
  (area) => {
    if (area) void lookups.loadEntities(true);
  },
);

/** "3 Geräte und 2 Einträge liegen in diesem Bereich. …" */
const deleteAreaText = computed(() => {
  const areaId = areas.deleting?.areaId;
  if (!areaId) return "";

  const devices = new Set(
    lookups.entities
      .filter((entity) => entity.areaId === areaId && entity.deviceId)
      .map((entity) => entity.deviceId),
  ).size;
  const own = entriesStore.entries.filter((entry) => entry.area?.areaId === areaId).length;

  if (devices + own === 0) return t("areas.deleteDialog.empty");

  return t("areas.deleteDialog.text", {
    what: [
      devices > 0 ? t("areas.deleteDialog.devices", { count: devices }, devices) : "",
      own > 0 ? t("areas.deleteDialog.entries", { count: own }, own) : "",
    ]
      .filter(Boolean)
      .join(t("areas.deleteDialog.and")),
  });
});

async function confirmAreaTidy(
  moves: Parameters<typeof props.actions.confirmAreaTidy>[0],
): Promise<void> {
  const path = await props.actions.confirmAreaTidy(moves);
  if (path) emit("tidied", path);
}

/** Who still uses the entry about to be deleted (it is the open one, so its dependencies are loaded). */
// "Gibt es schon" needs every entity ID HA has.
watch(
  () => props.entryActions.renamingId.value,
  (renaming) => {
    if (renaming) void lookups.loadEntities(true);
  },
);

const takenIds = computed(
  () =>
    new Set([
      ...lookups.entities.map((entity) => entity.entityId),
      ...entriesStore.entries.map((entry) => entry.entityId),
    ]),
);

/** Who still uses the entry about to be disabled (the open one, so its dependencies are loaded). */
const disableUsers = computed(() => {
  const entityId = props.entryActions.disablingEntry.value?.entityId;
  const current = dependencies.current;
  return entityId && current?.entityId === entityId ? current.usedBy : [];
});

const deleteUsers = computed(() => {
  const entityId = props.entryActions.deletingEntry.value?.entityId;
  const current = dependencies.current;
  return entityId && current?.entityId === entityId ? current.usedBy : [];
});

async function onPlanApplied(): Promise<void> {
  // Renamed folders keep their colors and empty subfolders in the overlay.
  await Promise.all([entriesStore.load(), foldersStore.load()]);
}

async function onCleanedUp(categoryCount: number): Promise<void> {
  cleanup.close();
  toasts.show(t("toast.cleanedUp", { count: categoryCount }, categoryCount));
  await entriesStore.load();
}

async function createFolder(path: string): Promise<void> {
  const storedPath = await props.create.confirmFolder(path);

  if (storedPath) emit("folderCreated", storedPath);
}

async function createHelper(helper: NewHelper): Promise<void> {
  const entityId = await props.create.confirmHelper(helper);

  if (entityId) emit("created", entityId);
}

async function createFlow(flow: NewFlow): Promise<void> {
  const entityId = await props.create.confirmFlow(flow);

  if (entityId) emit("created", entityId);
}

async function pickColor(color: string | null): Promise<void> {
  if (!props.colorPath) return;

  await props.entryActions.setFolderColor(props.colorPath, color);
  emit("closeColor");
}
</script>

<style scoped>
.studio-dialogs__warn {
  margin: 14px 0 8px;
  color: var(--fg);
  font-weight: 600;
}

.studio-dialogs__users {
  overflow: hidden;
  border: 1px solid var(--line);
  border-radius: 10px;
}
</style>
