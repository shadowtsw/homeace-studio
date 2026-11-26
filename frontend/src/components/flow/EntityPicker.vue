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

    <div class="entity-picker__criteria">
      <button
        v-for="key in CRITERIA_KEYS"
        :key="key"
        type="button"
        class="entity-picker__criterion"
        :class="{
          'entity-picker__criterion--open': openCriterion === key,
          'entity-picker__criterion--set': criteria[key] !== null,
        }"
        :aria-expanded="openCriterion === key"
        @click="openCriterion = openCriterion === key ? null : key"
      >
        <span class="mdi" :class="CRITERION_ICON[key]" />
        {{ t(`picker.criteria.${key}`)
        }}<template v-if="criteria[key] !== null">: {{ valueLabel(key, criteria[key]!) }}</template>
        <span class="mdi" :class="openCriterion === key ? 'mdi-chevron-up' : 'mdi-chevron-down'" />
      </button>
      <button v-if="hasCriteria" type="button" class="entity-picker__reset" @click="resetCriteria">
        {{ t("picker.reset") }}
      </button>
    </div>

    <div v-if="openCriterion" class="entity-picker__panel">
      <button
        v-for="option in criterionChoices"
        :key="option.value"
        type="button"
        class="entity-picker__chip"
        :class="{ 'entity-picker__chip--on': criteria[openCriterion] === option.value }"
        @click="toggleCriterion(openCriterion, option.value)"
      >
        <span v-if="openCriterion === 'area'" class="mdi" :class="areaIcon(option.value)" />
        {{ valueLabel(openCriterion, option.value) }}
        <small>{{ option.count }}</small>
      </button>
    </div>

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
import { computed, onMounted, reactive, ref, useTemplateRef, watch } from "vue";
import { useI18n } from "vue-i18n";

import { useLookupsStore } from "@/stores/lookupsStore";
import type { EntityOption } from "@/types/editor";
import {
  CRITERIA_KEYS,
  NO_AREA,
  countByDevice,
  criterionOptions,
  groupByDevice,
  matchesCriteria,
  matchesQuery,
  rowLabel,
  suggestEntities,
  type CriterionKey,
  type PickerCriteria,
} from "@/utils/entities/entityPicker";
import { mdiIconClass } from "@/utils/text";

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
const CRITERION_ICON: Record<CriterionKey, string> = {
  area: "mdi-map-marker-outline",
  label: "mdi-label-outline",
  kind: "mdi-shape-outline",
};

const { t, te } = useI18n();
const lookups = useLookupsStore();
const searchInput = useTemplateRef("searchInput");

const query = ref("");
const criteria = reactive<PickerCriteria>({ area: null, label: null, kind: null });
/** The area criterion starts open: choosing an area is the usual way in. */
const openCriterion = ref<CriterionKey | null>("area");

const kindLabel = (domain: string): string =>
  te(`picker.kinds.${domain}`) ? t(`picker.kinds.${domain}`) : domain;

/** "Lichter" for the filter hint; kinds without a plural keep their name. */
const pluralKind = (domain: string): string =>
  te(`picker.plural.${domain}`) ? t(`picker.plural.${domain}`) : kindLabel(domain);

/** Only what HA allows for this field. */
const allowed = computed(() =>
  props.domains.length === 0
    ? props.entities
    : props.entities.filter((entity) => props.domains.includes(entity.domain)),
);
const deviceCounts = computed(() => countByDevice(props.entities));
const hasCriteria = computed(() => CRITERIA_KEYS.some((key) => criteria[key] !== null));
const onlyArea = computed(() =>
  !query.value.trim() && criteria.area !== null && !criteria.label && !criteria.kind
    ? criteria.area
    : null,
);
const mode = computed(() =>
  onlyArea.value !== null ? "area" : query.value.trim() || hasCriteria.value ? "results" : "start",
);

const criterionChoices = computed(() =>
  openCriterion.value
    ? criterionOptions({ entities: allowed.value, key: openCriterion.value })
    : [],
);
const results = computed(() =>
  allowed.value.filter(
    (entity) =>
      matchesCriteria({ entity, criteria }) &&
      matchesQuery({ entity, query: query.value, kindLabel }),
  ),
);
const inArea = computed(() =>
  allowed.value.filter((entity) => matchesCriteria({ entity, criteria })),
);
const deviceGroups = computed(() => groupByDevice(inArea.value));
const suggested = computed(() =>
  suggestEntities({
    entities: allowed.value,
    usedIds: new Set(props.usedIds),
    areaId: props.areaId,
  }),
);
const areaName = computed(
  () => props.entities.find((entity) => entity.areaId === props.areaId)?.areaName ?? null,
);

/** "All lights · Living room": only for action targets with a known kind and a real area. */
const areaTarget = computed(() => {
  if (!props.canPickArea || props.domains.length === 0 || onlyArea.value === NO_AREA) return null;

  const first = inArea.value.find((entity) => entity.areaId);

  return first?.areaId && first.areaName
    ? { areaId: first.areaId, areaName: first.areaName, count: inArea.value.length }
    : null;
});
const pluralKinds = computed(() =>
  props.domains.length === 1 && te(`picker.plural.${props.domains[0]}`)
    ? t(`picker.plural.${props.domains[0]}`)
    : t("picker.plural.other"),
);

/** Picked entities HA no longer has, so they can still be seen and removed. */
const goneIds = computed(() =>
  props.selected.filter((id) => !props.entities.some((entity) => entity.entityId === id)),
);

function valueLabel(key: CriterionKey, value: string): string {
  if (key === "area") return value === NO_AREA ? t("picker.noArea") : value;
  if (key === "kind") return kindLabel(value);
  return value;
}

function areaIcon(value: string): string {
  const area = lookups.areas.find((item) => item.name === value);
  return mdiIconClass(area?.icon ?? null) ?? "mdi-map-marker-outline";
}

/** One value per criterion, like radio buttons: another chip switches, the chosen one clears. */
function toggleCriterion(key: CriterionKey, value: string): void {
  criteria[key] = criteria[key] === value ? null : value;
}

function resetCriteria(): void {
  for (const key of CRITERIA_KEYS) criteria[key] = null;
}

// Typing searches everything; the open chips would only push the results down.
watch(query, (text) => {
  if (text.trim() && openCriterion.value === "area" && criteria.area === null) {
    openCriterion.value = null;
  }
});

onMounted(() => searchInput.value?.focus({ preventScroll: true }));
</script>

<style scoped>
.entity-picker {
  display: grid;
  gap: 8px;
  min-height: 0;
}

.entity-picker__criteria {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 5px;
}

.entity-picker__criterion {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 4px 8px;
  border: 1px dashed var(--line-strong);
  border-radius: 8px;
  background: none;
  color: var(--muted);
  font-size: 12.5px;
  font-weight: 600;
  cursor: pointer;
}

.entity-picker__criterion:hover,
.entity-picker__criterion--open {
  border-style: solid;
  color: var(--fg);
}

.entity-picker__criterion--set {
  border-style: solid;
  border-color: var(--accent);
  background: var(--accent-soft);
  color: var(--accent);
}

.entity-picker__reset {
  margin-left: auto;
  border: 0;
  background: none;
  color: var(--muted);
  font-size: 12px;
  text-decoration: underline;
  cursor: pointer;
}

.entity-picker__panel {
  display: flex;
  flex-wrap: wrap;
  gap: 5px;
  padding: 8px;
  border: 1px solid var(--line);
  border-radius: 10px;
  background: var(--surface-2);
}

.entity-picker__chip {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 4px 10px;
  border: 1px solid var(--line);
  border-radius: 999px;
  background: var(--surface);
  color: var(--muted);
  font-size: 12.5px;
  cursor: pointer;
}

.entity-picker__chip:hover {
  border-color: var(--line-strong);
  color: var(--fg);
}

.entity-picker__chip--on {
  border-color: var(--fg);
  background: var(--fg);
  color: var(--bg);
}

.entity-picker__chip small {
  opacity: 0.7;
  font-variant-numeric: tabular-nums;
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
