<template>
  <li
    class="area-node"
    :class="{
      'area-node--active': isActive,
      'area-node--empty': count === 0,
      'area-node--drop': isDropOver,
      'area-node--actions': hasActions,
    }"
    @dragover="onDragOver"
    @dragleave="onDragLeave"
    @drop="onDrop"
  >
    <button type="button" class="area-node__main" @click="emit('select')">
      <AppIcon :icon="icon" :fallback="iconClass" />
      <InlineNameInput
        v-if="isRenaming"
        :value="name"
        :label="t('areas.edit', { name })"
        @save="
          (next) => {
            isRenaming = false;
            emit('renameInline', next);
          }
        "
        @cancel="isRenaming = false"
      />
      <span v-else class="area-node__name" @dblclick.stop="hasActions && (isRenaming = true)">{{
        name
      }}</span>
      <span class="area-node__count">{{ count }}</span>
    </button>
    <span v-if="hasActions" class="area-node__actions">
      <button
        class="icon-btn"
        type="button"
        :title="t('areas.edit', { name })"
        :aria-label="t('areas.edit', { name })"
        @click="emit('edit')"
      >
        <span class="mdi mdi-pencil-outline" />
      </button>
      <button
        class="icon-btn"
        type="button"
        :title="t('areas.delete', { name })"
        :aria-label="t('areas.delete', { name })"
        @click="emit('delete')"
      >
        <span class="mdi mdi-delete-outline" />
      </button>
    </span>
  </li>
</template>

<script setup lang="ts">
import { ref } from "vue";
import { useI18n } from "vue-i18n";

import AppIcon from "@/components/common/AppIcon.vue";
import InlineNameInput from "@/components/common/InlineNameInput.vue";

import { useEntryDropTarget } from "@/composables/dragDrop/useEntryDropTarget";

/** One area in the tree of the area view; entries dropped on it get it as their own area. */
defineProps<{
  name: string;
  count: number;
  /** The area's own icon in HA ("mdi:sofa", also from an icon pack); without one, iconClass. */
  icon?: string | null;
  /** MDI class shown without an own icon. */
  iconClass: string;
  isActive: boolean;
  /** Edit and delete; not for "Ohne Bereich". */
  hasActions: boolean;
}>();

const emit = defineEmits<{
  select: [];
  edit: [];
  delete: [];
  dropEntry: [entityId: string];
  /** Double click on the name renamed the area in place. */
  renameInline: [name: string];
}>();

const isRenaming = ref(false);

const { t } = useI18n();
const { isDropOver, onDragOver, onDragLeave, onDrop } = useEntryDropTarget({
  onEntryDropped: (entityId) => emit("dropEntry", entityId),
});
</script>

<style scoped>
.area-node {
  position: relative;
  display: flex;
  align-items: center;
  border-radius: var(--radius-sm);
}

.area-node:hover {
  background: var(--sunken);
}

.area-node__main {
  display: flex;
  flex: 1;
  align-items: center;
  gap: 9px;
  min-width: 0;
  height: 32px;
  padding: 0 8px;
  border: 0;
  background: none;
  color: var(--muted);
  cursor: pointer;
  font: inherit;
  text-align: left;
}

.area-node__main .mdi {
  color: var(--faint);
  font-size: 17px;
}

.area-node__name {
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.area-node__count {
  color: var(--faint);
  font-size: 12px;
  font-variant-numeric: tabular-nums;
}

.area-node--empty .area-node__name {
  color: var(--faint);
}

.area-node--active {
  background: var(--surface);
  box-shadow: inset 0 0 0 1px var(--line-strong);
}

.area-node--active .area-node__main {
  color: var(--fg);
  font-weight: 600;
}

.area-node--drop {
  background: var(--accent-soft);
  box-shadow: inset 0 0 0 2px var(--accent);
}

.area-node__actions {
  display: none;
  padding-right: 2px;
}

.area-node__actions .icon-btn {
  width: 26px;
  height: 26px;
  font-size: 15px;
}

.area-node:hover .area-node__actions,
.area-node:focus-within .area-node__actions {
  display: flex;
}

.area-node--actions:hover .area-node__count,
.area-node--actions:focus-within .area-node__count {
  display: none;
}

@media (hover: none) {
  .area-node--active .area-node__actions {
    display: flex;
  }

  .area-node--active.area-node--actions .area-node__count {
    display: none;
  }
}
</style>
