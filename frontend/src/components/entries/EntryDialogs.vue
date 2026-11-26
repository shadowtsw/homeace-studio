<template>
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
      <p class="entry-dialogs__warn">{{ t("deps.deleteWarning") }}</p>
      <div class="entry-dialogs__users">
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
      <p class="entry-dialogs__warn">{{ t("visibility.disableWarning") }}</p>
      <div class="entry-dialogs__users">
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
    @confirm="
      (newEntityId, withReferences) => entryActions.confirmRenameId({ newEntityId, withReferences })
    "
  />
</template>

<script setup lang="ts">
import { computed, watch } from "vue";
import { useI18n } from "vue-i18n";

import ConfirmDialog from "@/components/common/ConfirmDialog.vue";
import DependencyUserRow from "@/components/dependencies/DependencyUserRow.vue";
import type { useEntryActions } from "@/composables/actions/useEntryActions";
import { useDependenciesStore } from "@/stores/dependenciesStore";
import { useEntriesStore } from "@/stores/entriesStore";
import { useLookupsStore } from "@/stores/lookupsStore";

import RenameEntityDialog from "./RenameEntityDialog.vue";

/** Asking before an entry is deleted or disabled (naming who still uses it), and a new entity ID. */
const props = defineProps<{
  entryActions: ReturnType<typeof useEntryActions>;
}>();

const { t } = useI18n();
const dependencies = useDependenciesStore();
const entriesStore = useEntriesStore();
const lookups = useLookupsStore();

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

/** Who still uses the entry about to be deleted (the open one, so its dependencies are loaded). */
const deleteUsers = computed(() => {
  const entityId = props.entryActions.deletingEntry.value?.entityId;
  const current = dependencies.current;
  return entityId && current?.entityId === entityId ? current.usedBy : [];
});
</script>

<style scoped>
.entry-dialogs__warn {
  margin: 14px 0 8px;
  color: var(--fg);
  font-weight: 600;
}

.entry-dialogs__users {
  overflow: hidden;
  border: 1px solid var(--line);
  border-radius: 10px;
}
</style>
