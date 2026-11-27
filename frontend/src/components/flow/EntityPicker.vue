<template>
  <div class="entity-picker">
    <input
      ref="searchInput"
      v-model="query"
      class="field-input"
      type="search"
      :placeholder="t('picker.search')"
      autocomplete="off"
    />

    <EntityPickerCriteria
      :criteria="criteria"
      :open-criterion="openCriterion"
      :choices="criterionChoices"
      :has-criteria="hasCriteria"
      @toggle-open="toggleOpen"
      @toggle-criterion="(key, value) => toggleCriterion({ key, value })"
      @reset="resetCriteria"
    />

    <p v-if="domains.length" class="entity-picker__filter">
      <span class="mdi mdi-filter-outline" />
      {{ t("picker.onlyKinds", { kinds: domains.map(pluralKind).join(", ") }) }}
    </p>

    <div class="entity-picker__list">
      <template v-if="goneIds.length">
        <button
          v-for="id in goneIds"
          :key="id"
          type="button"
          class="entity-picker__row entity-picker__row--gone"
          :class="{ 'entity-picker__row--on': selected.includes(id) }"
          @click="emit('pick', id)"
        >
          <span class="mdi mdi-link-variant-off" />
          <span class="entity-picker__main">
            <b>{{ id }}</b>
            <small>{{ t("picker.gone") }}</small>
          </span>
        </button>
      </template>

      <template v-if="mode === 'area'">
        <button
          v-if="areaTarget"
          type="button"
          class="entity-picker__row entity-picker__row--all"
          @click="emit('pickArea', areaTarget.areaId)"
        >
          <span class="mdi mdi-select-group" />
          <span class="entity-picker__main">
            <b>{{ t("picker.allInArea", { kinds: pluralKinds, area: areaTarget.areaName }) }}</b>
            <small>{{ t("picker.allInAreaHint", { count: areaTarget.count }) }}</small>
          </span>
        </button>
        <template
          v-for="group in deviceGroups"
          :key="group.deviceId ?? group.entities[0]?.entityId"
        >
          <div v-if="group.entities.length > 1" class="entity-picker__device">
            <div class="entity-picker__device-name">
              <span class="mdi mdi-devices" />{{ group.deviceName }}
            </div>
            <EntityPickerRow
              v-for="entity in group.entities"
              :key="entity.entityId"
              :entity="entity"
              :label="rowLabel({ entity, where: 'card', deviceEntityCounts: deviceCounts })"
              :is-selected="selected.includes(entity.entityId)"
              :is-technical-details-visible="isTechnicalDetailsVisible"
              @pick="emit('pick', $event)"
            />
          </div>
          <EntityPickerRow
            v-else
            :entity="group.entities[0]!"
            :label="
              rowLabel({
                entity: group.entities[0]!,
                where: 'list',
                deviceEntityCounts: deviceCounts,
              })
            "
            :is-selected="selected.includes(group.entities[0]!.entityId)"
            :is-technical-details-visible="isTechnicalDetailsVisible"
            @pick="emit('pick', $event)"
          />
        </template>
        <p v-if="deviceGroups.length === 0" class="entity-picker__empty">
          {{ t("picker.nothing") }}
        </p>
      </template>

      <template v-else-if="mode === 'results'">
        <div class="entity-picker__heading">
          {{ t("picker.hits", { count: results.length }, results.length) }}
        </div>
        <EntityPickerRow
          v-for="entity in results.slice(0, MAX_ROWS)"
          :key="entity.entityId"
          :entity="entity"
          :label="rowLabel({ entity, where: 'list', deviceEntityCounts: deviceCounts })"
          :place="entity.areaName ?? t('picker.noArea')"
          :is-selected="selected.includes(entity.entityId)"
          :is-technical-details-visible="isTechnicalDetailsVisible"
          @pick="emit('pick', $event)"
        />
        <p v-if="results.length > MAX_ROWS" class="entity-picker__empty">
          {{ t("picker.more", { count: results.length - MAX_ROWS }) }}
        </p>
        <p v-if="results.length === 0" class="entity-picker__empty">{{ t("picker.nothing") }}</p>
      </template>

      <template v-else>
        <template v-if="suggested.length">
          <div class="entity-picker__heading">
            {{ areaName ? t("picker.suggestionsIn", { area: areaName }) : t("picker.suggestions") }}
          </div>
          <EntityPickerRow
            v-for="entity in suggested"
            :key="entity.entityId"
            :entity="entity"
            :label="rowLabel({ entity, where: 'list', deviceEntityCounts: deviceCounts })"
            :place="entity.areaName ?? t('picker.noArea')"
            :is-selected="selected.includes(entity.entityId)"
            :is-technical-details-visible="isTechnicalDetailsVisible"
            @pick="emit('pick', $event)"
          />
        </template>
        <p v-else class="entity-picker__empty">{{ t("picker.start") }}</p>
      </template>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref, useTemplateRef } from "vue";
import { useI18n } from "vue-i18n";

import { useEntityPicker } from "@/composables/flow/useEntityPicker";
import type { EntityOption } from "@/types/editor";
import { rowLabel } from "@/utils/entities/entityPicker";

import EntityPickerCriteria from "./EntityPickerCriteria.vue";
import EntityPickerRow from "./EntityPickerRow.vue";

/**
 * Picks an entity the way people think: by area, then device, then function, with suggestions
 * from the flow, live states, and criteria (area, label, kind) that combine with "and".
 */
const props = defineProps<{
  entities: EntityOption[];
  selected: string[];
  /** HA's requirement for this field; empty means any entity. */
  domains: string[];
  /** Entities the flow already uses, suggested first. */
  usedIds: string[];
  /** The automation's own area, for suggestions. */
  areaId: string | null;
  /** Action targets can take a whole area ("all lights in the living room"). */
  canPickArea: boolean;
  isTechnicalDetailsVisible: boolean;
}>();

const emit = defineEmits<{
  pick: [entityId: string];
  pickArea: [areaId: string];
}>();

const MAX_ROWS = 60;

const { t } = useI18n();
const searchInput = useTemplateRef("searchInput");
const query = ref("");
const {
  criteria,
  openCriterion,
  pluralKind,
  deviceCounts,
  hasCriteria,
  mode,
  criterionChoices,
  results,
  deviceGroups,
  suggested,
  areaName,
  areaTarget,
  pluralKinds,
  goneIds,
  toggleOpen,
  toggleCriterion,
  resetCriteria,
} = useEntityPicker({ picker: props, query });

onMounted(() => searchInput.value?.focus({ preventScroll: true }));
</script>

<style scoped>
/* A column: search, criteria and hint keep their height, the list takes the rest and scrolls. */
.entity-picker {
  display: flex;
  flex: 1 1 auto;
  flex-direction: column;
  gap: 8px;
  min-height: 0;
}

.entity-picker__filter {
  display: flex;
  align-items: center;
  gap: 6px;
  margin: 0;
  padding: 6px 10px;
  border-radius: 8px;
  background: var(--accent-soft);
  color: var(--accent);
  font-size: 12px;
}

.entity-picker__list {
  display: block;
  flex: 1 1 auto;
  min-height: 0;
  max-height: min(380px, 50vh);
  overflow: auto;
}

.entity-picker__heading {
  padding: 6px 8px 4px;
  color: var(--faint);
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.07em;
  text-transform: uppercase;
}

.entity-picker__device {
  overflow: hidden;
  margin: 2px 0 6px;
  border: 1px solid var(--line);
  border-radius: 10px;
}

.entity-picker__device-name {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 7px 10px;
  background: var(--surface-2);
  font-size: 12.5px;
  font-weight: 700;
}

.entity-picker__device-name .mdi {
  color: var(--muted);
}

.entity-picker__row {
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;
  padding: 8px 10px;
  border: 0;
  border-radius: 8px;
  background: none;
  text-align: left;
  cursor: pointer;
}

.entity-picker__row:hover,
.entity-picker__row:focus-visible {
  background: var(--sunken);
}

.entity-picker__row--on {
  background: var(--accent-soft);
}

.entity-picker__row--all,
.entity-picker__row--all .mdi {
  color: var(--accent);
}

.entity-picker__row--gone,
.entity-picker__row--gone .mdi {
  color: var(--err);
}

.entity-picker__main {
  display: flex;
  flex: 1;
  flex-direction: column;
  min-width: 0;
}

.entity-picker__main b {
  overflow: hidden;
  font-weight: 600;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.entity-picker__main small {
  color: var(--faint);
  font-size: 11.5px;
}

.entity-picker__empty {
  margin: 0;
  padding: 14px;
  color: var(--muted);
  font-size: 12.5px;
  text-align: center;
}
</style>
