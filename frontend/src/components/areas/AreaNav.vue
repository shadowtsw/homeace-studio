<template>
  <div class="area-nav">
    <div class="area-nav__heading">
      <span>{{ t("areas.heading") }}</span>
      <button
        class="area-nav__add"
        type="button"
        :title="t('areas.newArea')"
        :aria-label="t('areas.newArea')"
        @click="emit('create')"
      >
        <span class="mdi mdi-map-marker-plus-outline" />
      </button>
    </div>

    <div v-if="looseCount > 0" class="area-nav__tidy">
      <span class="mdi mdi-auto-fix area-nav__tidy-icon" />
      <div>
        <b>{{ t("areas.tidy.title") }}</b>
        {{ t("areas.tidy.cardText") }}
        {{ t("areas.tidy.cardCount", { count: looseCount }, looseCount) }}
        <div class="area-nav__tidy-buttons">
          <button class="btn btn--primary" type="button" @click="emit('tidy')">
            {{ t("areas.tidy.open") }}
          </button>
        </div>
      </div>
    </div>

    <p v-if="!hasLoaded" class="area-nav__note">{{ t("areas.loading") }}</p>
    <template v-else>
      <p v-if="areas.length === 0" class="area-nav__note">{{ t("areas.noAreas") }}</p>
      <ul class="area-nav__list">
        <AreaNavNode
          v-for="area in areas"
          :key="area.areaId"
          :name="area.name"
          :count="area.count"
          :icon="area.icon"
          icon-class="mdi-map-marker-outline"
          :is-active="selected === areaFilter(area.areaId)"
          has-actions
          @select="emit('select', areaFilter(area.areaId))"
          @edit="emit('edit', area.areaId)"
          @delete="emit('delete', area.areaId)"
          @drop-entry="(entityId) => emit('dropEntry', area.areaId, entityId)"
          @rename-inline="(name) => emit('renameArea', area.areaId, name)"
        />
        <AreaNavNode
          :name="t('areas.none')"
          :count="noAreaCount"
          icon-class="mdi-map-marker-off-outline"
          :is-active="selected === areaFilter(null)"
          :has-actions="false"
          @select="emit('select', areaFilter(null))"
          @drop-entry="(entityId) => emit('dropEntry', null, entityId)"
        />
      </ul>
    </template>

    <p class="area-nav__hint">
      <span class="mdi mdi-information-outline" />
      <span>{{ t("areas.note") }}</span>
    </p>
  </div>
</template>

<script setup lang="ts">
import { useI18n } from "vue-i18n";

import type { AreaNavItem } from "@/composables/useStudioData";
import { areaFilter } from "@/utils/entryFilter";

import AreaNavNode from "./AreaNavNode.vue";

/** The tree of the area view: every area with entries, "Ohne Bereich" and the tidy-up card. */
defineProps<{
  areas: AreaNavItem[];
  noAreaCount: number;
  /** Entries without a folder that have an area; the tidy-up card shows when there are any. */
  looseCount: number;
  selected: string;
  hasLoaded: boolean;
}>();

const emit = defineEmits<{
  select: [category: string];
  tidy: [];
  create: [];
  edit: [areaId: string];
  delete: [areaId: string];
  /** `areaId` null: dropped on "Ohne Bereich", which takes the own area away. */
  dropEntry: [areaId: string | null, entityId: string];
  renameArea: [areaId: string, name: string];
}>();

const { t } = useI18n();
</script>

<style scoped>
.area-nav {
  display: grid;
  gap: 2px;
}

.area-nav__heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin: 16px 6px 6px;
  color: var(--faint);
  font-size: 11.5px;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.area-nav__add {
  display: grid;
  place-items: center;
  width: 24px;
  height: 24px;
  padding: 0;
  border: 0;
  border-radius: 6px;
  background: none;
  color: var(--faint);
  cursor: pointer;
  font-size: 17px;
}

.area-nav__add:hover {
  background: var(--line);
  color: var(--fg);
}

.area-nav__tidy {
  display: flex;
  align-items: flex-start;
  gap: 9px;
  margin: 2px 2px 12px;
  padding: 10px 10px 10px 11px;
  border-radius: 10px;
  background: var(--accent-soft);
  color: var(--muted);
  font-size: 12.5px;
  line-height: 1.4;
}

.area-nav__tidy b {
  display: block;
  margin-bottom: 1px;
  color: var(--fg);
  font-size: 13px;
}

.area-nav__tidy-icon {
  margin-top: 1px;
  color: var(--accent);
  font-size: 18px;
}

.area-nav__tidy-buttons {
  margin-top: 8px;
}

.area-nav__tidy-buttons .btn {
  height: 28px;
  padding: 0 10px;
  font-size: 12.5px;
}

.area-nav__list {
  display: grid;
  gap: 2px;
  margin: 0;
  padding: 0;
  list-style: none;
}

.area-nav__note {
  margin: 4px 8px;
  color: var(--muted);
  font-size: 12.5px;
}

.area-nav__hint {
  display: flex;
  gap: 6px;
  margin: 14px 6px 0;
  color: var(--faint);
  font-size: 12px;
  line-height: 1.45;
}
</style>
