<template>
  <!-- A div, not a button: browsers (Firefox at all) do not start a drag from a button. -->
  <div
    role="button"
    tabindex="0"
    class="entity-list-row"
    :class="{
      'entity-list-row--pressed': isPressed,
      'entity-list-row--checked': isChecked,
      'entity-list-row--checking': isCheckActive,
    }"
    :data-plain-entity-id="entity.entityId"
    draggable="true"
    :title="entity.isInRegistry ? t('entityRow.hint') : t('entityRow.hintNoFolder')"
    @pointerdown="press"
    @pointerup="release"
    @pointercancel="release"
    @pointerleave="release"
    @dragstart="startDrag"
    @dragend="endDrag"
    @click="open"
    @keydown.enter.prevent="open"
    @keydown.space.prevent="open"
  >
    <!-- Its own click: ticking never opens the row's menu -->
    <input
      class="entity-list-row__check"
      type="checkbox"
      draggable="false"
      :checked="isChecked"
      :disabled="!entity.isInRegistry"
      :aria-label="t('list.check', { name: entity.shortName })"
      :title="entity.isInRegistry ? t('list.checkHint') : t('entityRow.hintNoFolder')"
      @click.stop="(event: MouseEvent) => emit('check', entity.entityId, event.shiftKey)"
      @pointerdown.stop
      @keydown.enter.stop
      @keydown.space.stop
    />
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
import { computed, ref } from "vue";
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
  isChecked: boolean;
  /** Some entity is ticked: the boxes stay visible, not only on hover. */
  isCheckActive: boolean;
}>();

const emit = defineEmits<{
  /** A click (or tap): the page offers where the entity can go. */
  open: [entity: EntityOption, anchor: HTMLElement];
  /** Its box was clicked; with Shift, everything from the last clicked box to here. */
  check: [entityId: string, withShift: boolean];
}>();

const { t } = useI18n();
const drag = usePlainEntityDrag();
/**
 * The closed hand while the mouse button is down. Not `:active`: Chromium keeps that state after a
 * drag that ends without a drop (or back on the row), so the closed hand would stay.
 */
const isPressed = ref(false);

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

function press(event: PointerEvent): void {
  if (event.pointerType === "mouse" && event.button === 0) isPressed.value = true;
}

function release(): void {
  isPressed.value = false;
}

function startDrag(event: DragEvent): void {
  // From here the browser shows its own drag cursor
  release();
  if (!event.dataTransfer) return;

  setDraggedPlainEntity(event.dataTransfer, props.entity.entityId);
  // Drop targets read it here: browsers hide the drag data until the drop
  drag.start(props.entity);
}

function endDrag(): void {
  release();
  drag.end();
}
</script>

<style scoped>
/* Lighter than an entry row: no quick actions; it is something to sort, tick or drag. */
.entity-list-row {
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;
  padding: 6px 10px 6px 12px;
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

.entity-list-row--pressed {
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

.entity-list-row--checked {
  background: var(--accent-soft);
}

/* Like the boxes of entry rows: faint until hovered or something is ticked */
.entity-list-row__check {
  flex: none;
  width: 16px;
  height: 16px;
  margin: 0;
  accent-color: var(--accent);
  cursor: pointer;
  opacity: 0.3;
}

.entity-list-row:hover .entity-list-row__check,
.entity-list-row__check:focus-visible,
.entity-list-row--checking .entity-list-row__check {
  opacity: 1;
}

.entity-list-row__check:disabled {
  cursor: default;
  opacity: 0.15;
}

@media (pointer: coarse) {
  .entity-list-row__check {
    opacity: 0.6;
  }
}
</style>
