<template>
  <!-- A div, not a button: browsers (Firefox at all) do not start a drag from a button. -->
  <div
    role="button"
    tabindex="0"
    class="entity-list-row"
    :data-plain-entity-id="entity.entityId"
    draggable="true"
    :title="entity.isInRegistry ? t('entityRow.hint') : t('entityRow.hintNoFolder')"
    @dragstart="startDrag"
    @dragend="drag.end()"
    @click="open"
    @keydown.enter.prevent="open"
    @keydown.space.prevent="open"
  >
    <span class="entity-list-row__icon">
      <span class="mdi" :class="DOMAIN_ICON[entity.domain] ?? FALLBACK_DOMAIN_ICON" />
    </span>
    <span class="entity-list-row__main">
      <span class="entity-list-row__name">{{ entity.shortName }}</span>
      <span v-if="isTechnicalDetailsVisible" class="entity-list-row__sub mono">
        {{ entity.entityId }}
      </span>
      <span v-else class="entity-list-row__sub">{{ subtitle }}</span>
    </span>
    <span class="entity-list-row__state">{{ stateText }}</span>
    <span class="mdi mdi-drag-vertical entity-list-row__grip" aria-hidden="true" />
  </div>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { useI18n } from "vue-i18n";

import { DOMAIN_ICON, FALLBACK_DOMAIN_ICON } from "@/constants/domainIcons";
import type { EntityOption } from "@/types/editor";
import { usePlainEntityDrag } from "@/composables/usePlainEntityDrag";
import { setDraggedPlainEntity } from "@/utils/dragDrop";

const props = defineProps<{
  entity: EntityOption;
  isTechnicalDetailsVisible: boolean;
  /** In the area view the area is the list itself, so the row leaves it out. */
  isAreaShown: boolean;
}>();

const emit = defineEmits<{
  /** A click (or tap): the page offers where the entity can go. */
  open: [entity: EntityOption, anchor: HTMLElement];
}>();

const { t } = useI18n();
const drag = usePlainEntityDrag();

const subtitle = computed(() =>
  [props.entity.deviceName, props.isAreaShown ? props.entity.areaName : null]
    .filter(Boolean)
    .join(" · "),
);
const stateText = computed(() =>
  props.entity.unit ? `${props.entity.state} ${props.entity.unit}` : props.entity.state,
);

function open(event: Event): void {
  emit("open", props.entity, event.currentTarget as HTMLElement);
}

function startDrag(event: DragEvent): void {
  if (!event.dataTransfer) return;

  setDraggedPlainEntity(event.dataTransfer, props.entity.entityId);
  // Drop targets read it here: browsers hide the drag data until the drop
  drag.start(props.entity);
}
</script>

<style scoped>
/* Lighter than an entry row: no checkbox, no quick actions; it is something to sort or to drag. */
.entity-list-row {
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;
  padding: 6px 10px 6px 26px;
  border: 1px solid transparent;
  border-radius: var(--radius-md);
  background: none;
  color: var(--fg);
  font: inherit;
  text-align: left;
  cursor: grab;
}

.entity-list-row:focus-visible {
  outline: 2px solid var(--accent);
  outline-offset: 1px;
}

.entity-list-row:hover {
  background: var(--surface);
}

.entity-list-row:active {
  cursor: grabbing;
}

.entity-list-row__icon {
  display: grid;
  place-items: center;
  flex: none;
  width: 28px;
  height: 28px;
  border-radius: 8px;
  background: var(--sunken);
  color: var(--muted);
  font-size: 16px;
}

.entity-list-row__main {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
}

.entity-list-row__name {
  overflow: hidden;
  font-size: 13.5px;
  font-weight: 600;
  white-space: nowrap;
  text-overflow: ellipsis;
}

.entity-list-row__sub {
  overflow: hidden;
  color: var(--faint);
  font-size: 12px;
  white-space: nowrap;
  text-overflow: ellipsis;
}

.entity-list-row__state {
  flex: none;
  max-width: 35%;
  overflow: hidden;
  color: var(--muted);
  font-size: 12px;
  white-space: nowrap;
  text-overflow: ellipsis;
}

.entity-list-row__grip {
  color: var(--faint);
  opacity: 0;
  transition: opacity 0.12s;
}

.entity-list-row:hover .entity-list-row__grip {
  opacity: 1;
}

@media (hover: none) {
  .entity-list-row {
    cursor: pointer;
  }

  .entity-list-row__grip {
    display: none;
  }
}
</style>
