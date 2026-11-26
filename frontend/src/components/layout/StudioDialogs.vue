<template>
  <RenameCategoryDialog
    v-if="actions.renamingPath.value"
    :folder-path="actions.renamingPath.value"
    :all-paths="allPaths"
    :is-busy="actions.isBusy.value"
    @cancel="actions.cancelRename"
    @confirm="actions.confirmRename"
  />
  <AreaDialogs
    :all-paths="allPaths"
    :actions="actions"
    :area-actions="areaActions"
    @tidied="(path) => emit('tidied', path)"
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
    @confirm="
      (path) =>
        actions.moveEntries({ entityIds: actions.movingIds.value ?? [], categoryPath: path })
    "
  />
  <MoveEntriesDialog
    v-if="actions.movingEntity.value"
    :count="1"
    :title="t('entityRow.moveTitle', { name: actions.movingEntity.value.name })"
    :all-paths="allPaths"
    :is-busy="actions.isBusy.value"
    @cancel="actions.cancelMoveEntity"
    @confirm="
      (path) =>
        actions.moveEntity({
          entityId: actions.movingEntity.value?.entityId ?? '',
          categoryPath: path,
        })
    "
  />
  <CreateDialogs
    :all-paths="allPaths"
    :current-folder="currentFolder"
    :create="create"
    @created="(entityId) => emit('created', entityId)"
    @folder-created="(path) => emit('folderCreated', path)"
  />
  <EntryDialogs :entry-actions="entryActions" />
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
import { useI18n } from "vue-i18n";

import AiPlanDialog from "@/components/ai/AiPlanDialog.vue";
import AreaDialogs from "@/components/areas/AreaDialogs.vue";
import CleanupDialog from "@/components/cleanup/CleanupDialog.vue";
import EntitySortingWindow from "@/components/entitySorting/EntitySortingWindow.vue";
import FolderColorDialog from "@/components/categories/FolderColorDialog.vue";
import RenameCategoryDialog from "@/components/categories/RenameCategoryDialog.vue";
import EntryDialogs from "@/components/entries/EntryDialogs.vue";
import MoveEntriesDialog from "@/components/entries/MoveEntriesDialog.vue";
import LabelDeleteDialog from "@/components/labels/LabelDeleteDialog.vue";
import ToastHost from "@/components/common/ToastHost.vue";
import SettingsWindow from "@/components/settings/SettingsWindow.vue";
import type { useAreaActions } from "@/composables/actions/useAreaActions";
import type { useCategoryActions } from "@/composables/actions/useCategoryActions";
import type { useCreateActions } from "@/composables/actions/useCreateActions";
import type { useEntryActions } from "@/composables/actions/useEntryActions";
import { useLabelActions } from "@/composables/actions/useLabelActions";
import { useAiStore } from "@/stores/aiStore";
import { useCleanupStore } from "@/stores/cleanupStore";
import { useEntitySortingStore } from "@/stores/entitySortingStore";
import { useEntriesStore } from "@/stores/entriesStore";
import { useFoldersStore } from "@/stores/foldersStore";
import { useSettingsWindowStore } from "@/stores/settingsWindowStore";
import { useToastStore } from "@/stores/toastStore";

import CreateDialogs from "./CreateDialogs.vue";

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
const settingsWindow = useSettingsWindowStore();

async function onPlanApplied(): Promise<void> {
  // Renamed folders keep their colors and empty subfolders in the overlay.
  await Promise.all([entriesStore.load(), foldersStore.load()]);
}

async function onCleanedUp(categoryCount: number): Promise<void> {
  cleanup.close();
  toasts.show({ text: t("toast.cleanedUp", { count: categoryCount }, categoryCount) });
  await entriesStore.load();
}

async function pickColor(color: string | null): Promise<void> {
  if (!props.colorPath) return;

  await props.entryActions.setFolderColor({ path: props.colorPath, color });
  emit("closeColor");
}
</script>
