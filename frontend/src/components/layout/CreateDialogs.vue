<template>
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
</template>

<script setup lang="ts">
import NewFolderDialog from "@/components/categories/NewFolderDialog.vue";
import NewFlowDialog from "@/components/flow/NewFlowDialog.vue";
import NewHelperDialog from "@/components/helpers/NewHelperDialog.vue";
import type { useCreateActions } from "@/composables/actions/useCreateActions";
import type { NewFlow } from "@/services/flowsService";
import type { NewHelper } from "@/services/helpersService";
import { useSettingsStore } from "@/stores/settingsStore";

/** The dialogs for something new on the studio page: a folder, a helper, an automation or script. */
const props = defineProps<{
  allPaths: string[];
  /** The open folder, preset as the place for something new. */
  currentFolder: string | null;
  create: ReturnType<typeof useCreateActions>;
}>();

const emit = defineEmits<{
  /** A new helper, automation or script exists; the page opens it. */
  created: [entityId: string];
  /** A new folder exists; the page opens it. */
  folderCreated: [path: string];
}>();

const settings = useSettingsStore();

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
</script>
