<template>
  <div class="bundle-row__entities">
    <label
      v-for="entity in bundle.entities"
      :key="entity.entityId"
      class="bundle-row__entity"
      :class="{ 'bundle-row__entity--out': sorting.excluded.has(entity.entityId) }"
    >
      <input
        type="checkbox"
        :checked="!sorting.excluded.has(entity.entityId)"
        @change="sorting.toggleExcluded(entity.entityId)"
      />
      {{ entity.name }}
      <code v-if="settings.isTechnicalDetailsVisible" class="bundle-row__id">{{
        entity.entityId
      }}</code>
      <span v-if="entity === bundle.main && bundle.entities.length > 1" class="bundle-row__tag">
        {{ t("entitySorting.suggestions.main") }}
      </span>
      <span v-if="entity.entityCategory" class="bundle-row__tag">{{
        t("entitySorting.suggestions.technical")
      }}</span>
      <span
        v-if="ownTargetOf(entity) && !sorting.excluded.has(entity.entityId)"
        class="bundle-row__own"
      >
        → {{ ownTargetOf(entity) }}
      </span>
    </label>
  </div>
</template>

<script setup lang="ts">
import { useI18n } from "vue-i18n";

import { useEntitySortingStore } from "@/stores/entitySortingStore";
import { useSettingsStore } from "@/stores/settingsStore";
import type { SortingEntity } from "@/types/entitySorting";
import { entityTarget } from "@/utils/entitySorting/compute";
import type { SortingBundle } from "@/utils/entitySorting/model";

/** The entities of an opened bundle: each can stay out, and a technical one may go elsewhere. */
const props = defineProps<{
  bundle: SortingBundle;
}>();

const { t } = useI18n();
const sorting = useEntitySortingStore();
const settings = useSettingsStore();

function ownTargetOf(entity: SortingEntity): string | null {
  return sorting.home
    ? (entityTarget({
        entity,
        bundle: props.bundle,
        input: { home: sorting.home, state: sorting.state() },
      })?.target ?? null)
    : null;
}
</script>

<style scoped>
/* The same as in SortingBundleRow: scoped styles do not reach into a child component. */
.bundle-row__tag {
  padding: 0 6px;
  border: 1px solid var(--line-strong);
  border-radius: 5px;
  color: var(--muted);
  font-size: 11px;
  font-weight: 600;
}

.bundle-row__entities {
  display: grid;
  gap: 2px;
  padding: 4px 12px 10px 39px;
  background: var(--surface-2);
}

.bundle-row__entity {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
  padding: 3px 0;
  font-size: 13px;
}

.bundle-row__entity--out {
  color: var(--faint);
  text-decoration: line-through;
}

.bundle-row__id {
  color: var(--faint);
  font-family: var(--font-mono);
  font-size: 11.5px;
}

.bundle-row__own {
  color: var(--accent);
  font-size: 12px;
  font-weight: 600;
}
</style>
