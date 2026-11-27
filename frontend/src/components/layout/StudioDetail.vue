<template>
  <EntryDetail
    :entry="data.selectedEntry.value"
    :is-technical-details-visible="settings.isTechnicalDetailsVisible"
    :all-category-paths="data.allCategoryPaths.value"
    :areas="lookups.areas"
    :labels="lookups.labels"
    :is-busy="isBusy"
    :display-flow="displayFlow"
    :catalog="catalog"
    @back="emit('back')"
    @move="onMove"
    @save="onSave"
    @act="onAct"
    @toggle-favorite="onToggleFavorite"
    @save-note="onSaveNote"
    @delete="onDelete"
    @save-flow="onSaveFlow"
    :findings="checkup.findingsFor(data.selectedEntry.value?.entityId)"
    @ignore-finding="ignoreFinding"
    @open="(entityId) => emit('select', entityId)"
    @ask-disable="onAskDisable"
    :is-renaming="
      studio.renaming?.place === 'title' &&
      studio.renaming.entityId === data.selectedEntry.value?.entityId
    "
    @start-rename="startTitleRename"
    @duplicate="onDuplicate"
    @rename="
      (name) =>
        entryActions.renameInPlace({ entityId: data.selectedEntry.value?.entityId ?? '', name })
    "
    @cancel-rename="studio.stopRename()"
    @rename-id="onRenameId"
  />
</template>

<script setup lang="ts">
import { computed } from "vue";
import { useI18n } from "vue-i18n";

import EntryDetail from "@/components/entries/EntryDetail.vue";
import type { useCategoryActions } from "@/composables/actions/useCategoryActions";
import type { useEntryActions } from "@/composables/actions/useEntryActions";
import type { useStudioData } from "@/composables/useStudioData";
import type { EntryAction } from "@/constants/entries";
import { useCheckupStore } from "@/stores/checkupStore";
import { useEditorStore } from "@/stores/editorStore";
import { useLookupsStore } from "@/stores/lookupsStore";
import { useMessagesStore } from "@/stores/messagesStore";
import { useSettingsStore } from "@/stores/settingsStore";
import { useStudioStore } from "@/stores/studioStore";
import { useToastStore } from "@/stores/toastStore";
import type { DisplayFlow, EditorCatalog } from "@/types/editor";
import type { Entry, EntryChanges } from "@/types/entry";

/** The detail column: the open entry with its flow, wired to the page's actions. */
const props = defineProps<{
  data: ReturnType<typeof useStudioData>;
  actions: ReturnType<typeof useCategoryActions>;
  entryActions: ReturnType<typeof useEntryActions>;
  /** The open flow as shown; null while loading or for other kinds. */
  displayFlow: DisplayFlow | null;
  /** Block types in the UI language; null until HA sent them. */
  catalog: EditorCatalog | null;
}>();

const emit = defineEmits<{
  /** Narrow screens: back from the detail layer to the list. */
  back: [];
  /** Open another entry (from the dependencies). */
  select: [entityId: string];
}>();

const { t } = useI18n();
const studio = useStudioStore();
const settings = useSettingsStore();
const lookups = useLookupsStore();
const editorStore = useEditorStore();
const checkup = useCheckupStore();
const toasts = useToastStore();
const messages = useMessagesStore();

const isBusy = computed(() => props.actions.isBusy.value || props.entryActions.isBusy.value);

/**
 * Wraps a detail handler so it only runs while an entry is open (the detail is empty otherwise).
 */
function onSelected<Args extends unknown[]>(
  handler: (entry: Entry, ...args: Args) => Promise<unknown> | void,
): (...args: Args) => void {
  return (...args) => {
    const entry = props.data.selectedEntry.value;

    if (entry) void handler(entry, ...args);
  };
}

const onMove = onSelected((entry, path: string | null) =>
  props.actions.moveEntry({ entityId: entry.entityId, categoryPath: path }),
);
const onSave = onSelected((entry, changes: EntryChanges) =>
  props.entryActions.save({ entityId: entry.entityId, changes }),
);
const onAct = onSelected((entry, action: EntryAction) => props.entryActions.act({ entry, action }));
const onToggleFavorite = onSelected((entry) => props.entryActions.toggleFavorite(entry));
const onSaveNote = onSelected((entry, note: string) =>
  props.entryActions.saveNote({ entry, note }),
);
const onDelete = onSelected((entry) => props.entryActions.askDelete(entry));
const onAskDisable = onSelected((entry) => props.entryActions.askDisable(entry));
const onDuplicate = onSelected((entry) => props.entryActions.duplicate({ entry }));
const onRenameId = onSelected((entry, preset: string | null) =>
  props.entryActions.startRenameId({ entry, preset }),
);
const onSaveFlow = onSelected(async (entry) => {
  try {
    await editorStore.save();
    toasts.show({ text: t("toast.flowSaved", { name: entry.name }) });
  } catch (error) {
    toasts.show({
      text: messages.textFor({ error, fallback: t("errors.actionFailed") }),
      tone: "error",
    });
  }
});

async function ignoreFinding(key: string): Promise<void> {
  try {
    await checkup.ignore(key);
    toasts.show({ text: t("toast.findingIgnored") });
  } catch (error) {
    toasts.show({
      text: messages.textFor({ error, fallback: t("errors.actionFailed") }),
      tone: "error",
    });
  }
}

function startTitleRename(): void {
  const entityId = props.data.selectedEntry.value?.entityId;
  if (entityId) studio.startRename({ entityId, place: "title" });
}
</script>
