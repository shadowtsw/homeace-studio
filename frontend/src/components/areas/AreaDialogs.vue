<template>
  <AreaDialog
    v-if="areas.draft"
    :area="areas.draft.area"
    :areas="lookups.areas"
    :is-busy="areaActions.isBusy.value"
    @cancel="areas.closeDraft"
    @confirm="(name, icon) => areaActions.saveDraft({ name, icon })"
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
</template>

<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { useI18n } from "vue-i18n";

import ConfirmDialog from "@/components/common/ConfirmDialog.vue";
import type { useAreaActions } from "@/composables/actions/useAreaActions";
import type { useCategoryActions } from "@/composables/actions/useCategoryActions";
import { useAreasStore } from "@/stores/areasStore";
import { useEntriesStore } from "@/stores/entriesStore";
import { useEntryAreasStore } from "@/stores/entryAreasStore";
import { useLookupsStore } from "@/stores/lookupsStore";

import AreaDialog from "./AreaDialog.vue";
import AreaTidyDialog from "./AreaTidyDialog.vue";
import SetAreaDialog from "./SetAreaDialog.vue";

/** The area dialogs of the studio page: create or edit, delete, set on entries, sort by area. */
const props = defineProps<{
  allPaths: string[];
  actions: ReturnType<typeof useCategoryActions>;
  areaActions: ReturnType<typeof useAreaActions>;
}>();

const emit = defineEmits<{
  /** Entries were sorted by area; the page opens the first folder. */
  tidied: [path: string];
}>();

const { t } = useI18n();
const areas = useAreasStore();
const entriesStore = useEntriesStore();
const entryAreas = useEntryAreasStore();
const lookups = useLookupsStore();

/** An area created from "Bereich setzen" is picked there when it comes back. */
const setAreaPreset = ref<string | null>(null);

function closeSetArea(): void {
  setAreaPreset.value = null;
  areas.closeSetArea();
}

async function setArea(areaId: string | null): Promise<void> {
  await props.areaActions.setOwnArea({ entityIds: areas.settingIds ?? [], areaId });
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
</script>
