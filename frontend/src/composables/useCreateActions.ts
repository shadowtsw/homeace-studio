import { ref, type Ref } from "vue";
import { useI18n } from "vue-i18n";

import { DEFAULT_STORED_TRACES } from "@/constants/traces";
import type { NewFlow } from "@/services/flowsService";
import type { NewHelper } from "@/services/helpersService";
import { useEntriesStore } from "@/stores/entriesStore";
import { useFoldersStore } from "@/stores/foldersStore";
import { useMessagesStore } from "@/stores/messagesStore";
import { useSettingsStore } from "@/stores/settingsStore";
import { useToastStore } from "@/stores/toastStore";
import { useTracesStore } from "@/stores/tracesStore";
import type { FlowKind } from "@/types/editor";

/** Where a new folder goes: below `parent`, or at the top when it is null. */
export type FolderDraft = { parent: string | null };

type CreateActions = {
  isBusy: Ref<boolean>;
  /** The open "new folder" dialog; null when closed. */
  folderDraft: Ref<FolderDraft | null>;
  isHelperDialogOpen: Ref<boolean>;
  startFolder: (parent: string | null) => void;
  cancelFolder: () => void;
  /** @returns The new folder path, or null when creating failed. */
  confirmFolder: (path: string) => Promise<string | null>;
  deleteFolder: (path: string) => Promise<void>;
  openHelperDialog: () => void;
  closeHelperDialog: () => void;
  /** @returns The entity ID of the new helper, or null when creating failed. */
  confirmHelper: (helper: NewHelper) => Promise<string | null>;
  /** The kind of the open "new automation / script" dialog; null when closed. */
  newFlowKind: Ref<FlowKind | null>;
  openFlowDialog: (kind: FlowKind) => void;
  closeFlowDialog: () => void;
  /** @returns The entity ID of the new flow, or null when creating failed. */
  confirmFlow: (flow: NewFlow) => Promise<string | null>;
};

/**
 * Creating folders, helpers, automations and scripts, with feedback as toasts and catalog texts
 * for errors.
 */
export function useCreateActions(): CreateActions {
  const { t } = useI18n();
  const entriesStore = useEntriesStore();
  const foldersStore = useFoldersStore();
  const messages = useMessagesStore();
  const settings = useSettingsStore();
  const toasts = useToastStore();
  const tracesStore = useTracesStore();

  const isBusy = ref(false);
  const folderDraft = ref<FolderDraft | null>(null);
  const isHelperDialogOpen = ref(false);
  const newFlowKind = ref<FlowKind | null>(null);

  /** Runs one action with the busy flag and turns errors into an error toast. */
  async function run<T>(action: () => Promise<T>): Promise<T | null> {
    isBusy.value = true;

    try {
      return await action();
    } catch (error) {
      toasts.show(messages.textFor(error, t("errors.actionFailed")), "error");
      return null;
    } finally {
      isBusy.value = false;
    }
  }

  async function confirmFolder(path: string): Promise<string | null> {
    const storedPath = await run(() => foldersStore.create(path));

    if (storedPath === null) return null;

    toasts.show(t("toast.folderCreated", { path: storedPath }));
    folderDraft.value = null;

    return storedPath;
  }

  async function deleteFolder(path: string): Promise<void> {
    const isDone = await run(async () => {
      await foldersStore.remove(path);
      return true;
    });

    if (isDone) toasts.show(t("toast.folderDeleted", { path }));
  }

  async function confirmHelper(helper: NewHelper): Promise<string | null> {
    const entityId = await run(() => entriesStore.createHelper(helper));

    if (entityId === null) return null;

    toasts.show(t("toast.helperCreated", { name: helper.name }));
    isHelperDialogOpen.value = false;

    return entityId;
  }

  /**
   * New flows keep as many runs as set under Einstellungen → Bearbeiten. HA's own default writes
   * nothing, so the config stays as HA would create it. A failure here leaves the flow in place.
   */
  async function keepRunsAsSet(entityId: string): Promise<void> {
    if (settings.storedTraces === DEFAULT_STORED_TRACES) return;

    try {
      await tracesStore.keepMore(entityId, settings.storedTraces);
    } catch (error) {
      toasts.show(messages.textFor(error, t("toast.storedTracesFailed")), "error");
    }
  }

  async function confirmFlow(flow: NewFlow): Promise<string | null> {
    // Create the flow
    const entityId = await run(() => entriesStore.createFlow(flow));

    if (entityId === null) return null;

    // Apply the user's default for kept runs, then report
    await keepRunsAsSet(entityId);
    toasts.show(t("toast.flowCreated", { name: flow.name }));
    newFlowKind.value = null;

    return entityId;
  }

  return {
    isBusy,
    folderDraft,
    isHelperDialogOpen,
    startFolder: (parent) => (folderDraft.value = { parent }),
    cancelFolder: () => (folderDraft.value = null),
    confirmFolder,
    deleteFolder,
    openHelperDialog: () => (isHelperDialogOpen.value = true),
    closeHelperDialog: () => (isHelperDialogOpen.value = false),
    confirmHelper,
    newFlowKind,
    openFlowDialog: (kind) => (newFlowKind.value = kind),
    closeFlowDialog: () => (newFlowKind.value = null),
    confirmFlow,
  };
}
