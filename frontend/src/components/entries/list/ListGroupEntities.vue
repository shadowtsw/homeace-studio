<template>
  <div v-if="hasEntries" class="list-group-entities__sep">
    <span class="mdi mdi-devices" />{{ t("scope.entities") }}
  </div>
  <EntityListRow
    v-for="entity in entities"
    :key="entity.entityId"
    :entity="entity"
    :is-technical-details-visible="settings.isTechnicalDetailsVisible"
    :is-area-shown="isAreaShown"
    :is-checked="studio.checkedEntityIds.has(entity.entityId)"
    :is-check-active="studio.checkedEntityIds.size > 0"
    @open="(item, anchor) => emit('open', item, anchor)"
    @check="(entityId, withShift) => emit('check', entityId, withShift)"
  />
  <!-- A big HA has hundreds of loose entities; they come in pages, so the list stays fast. -->
  <button
    v-if="hiddenCount > 0"
    type="button"
    class="list-group-entities__more"
    @click="emit('more')"
  >
    {{ t("list.moreEntities", { count: hiddenCount }) }}
  </button>
</template>

<script setup lang="ts">
import { useI18n } from "vue-i18n";

import { useSettingsStore } from "@/stores/settingsStore";
import { useStudioStore } from "@/stores/studioStore";
import type { EntityOption } from "@/types/editor";

import EntityListRow from "./EntityListRow.vue";

/** The plain entities of a folder group in the list, after its entries; they come in pages. */
defineProps<{
  /** The entities shown so far. */
  entities: EntityOption[];
  /** Entities of the group not shown yet ("Weitere … anzeigen"). */
  hiddenCount: number;
  /** The group has entries too; a line then separates the entities from them. */
  hasEntries: boolean;
  /** No area column while an area is selected (they all share it). */
  isAreaShown: boolean;
}>();

const emit = defineEmits<{
  /** An entity was clicked: the page offers where it can go. */
  open: [entity: EntityOption, anchor: HTMLElement];
  check: [entityId: string, withShift: boolean];
  /** "Weitere … anzeigen". */
  more: [];
}>();

const { t } = useI18n();
const studio = useStudioStore();
const settings = useSettingsStore();
</script>

<style scoped>
/* Plain entities inside a folder group, after its entries */
.list-group-entities__sep {
  display: flex;
  align-items: center;
  gap: 6px;
  margin: 8px 10px 2px 16px;
  color: var(--faint);
  font-size: 11.5px;
  font-weight: 600;
  letter-spacing: 0.05em;
  text-transform: uppercase;
}

.list-group-entities__more {
  display: block;
  margin: 4px 0 8px 26px;
  padding: 4px 8px;
  border: 0;
  border-radius: 7px;
  background: none;
  color: var(--accent);
  font: inherit;
  font-size: 12.5px;
  font-weight: 600;
  cursor: pointer;
}

.list-group-entities__more:hover {
  background: var(--sunken);
}
</style>
