<template>
  <div
    class="entry-list-row"
    :class="{
      'entry-list-row--active': isSelected,
      'entry-list-row--off': isOff,
      'entry-list-row--checked': isChecked,
      'entry-list-row--checking': isCheckActive,
    }"
    :data-entity-id="entry.entityId"
    :draggable="entry.isInRegistry && !isRenaming"
    @dragstart="startDrag"
    @dragend="drag.end()"
  >
    <input
      class="entry-list-row__check"
      type="checkbox"
      :checked="isChecked"
      :disabled="!entry.isInRegistry"
      :aria-label="t('list.check', { name: entry.name })"
      :title="entry.isInRegistry ? t('list.checkHint') : t('detail.notInRegistry')"
      @click="(event: MouseEvent) => emit('check', entry.entityId, event.shiftKey)"
    />
    <component
      :is="isRenaming ? 'div' : 'button'"
      class="entry-list-row__open"
      :type="isRenaming ? undefined : 'button'"
      @click="isRenaming || emit('select', entry.entityId)"
    >
      <span class="entry-list-row__icon" :class="`kind-${entry.kind}`">
        <AppIcon :icon="entry.icon" :fallback="ENTRY_KIND_ICON[entry.kind]" />
      </span>
      <span class="entry-list-row__main">
        <span class="entry-list-row__name">
          <InlineNameInput
            v-if="isRenaming"
            :value="entry.name"
            :label="t('list.rename')"
            @save="(name) => emit('rename', name)"
            @cancel="emit('cancelRename')"
          />
          <span
            v-else
            class="entry-list-row__name-text"
            @dblclick.stop="entry.isInRegistry && emit('startRename')"
            >{{ entry.name }}</span
          >
          <span v-if="entry.isFavorite" class="mdi mdi-star entry-list-row__star" />
          <span
            v-if="hasUnsavedChanges"
            class="entry-list-row__unsaved"
            :title="t('flow.unsaved')"
            :aria-label="t('flow.unsaved')"
          />
        </span>
        <span v-if="isTechnicalDetailsVisible" class="entry-list-row__sub mono">
          {{ entry.entityId }}
        </span>
        <span v-else class="entry-list-row__sub">{{ subtitle }}</span>
        <span v-if="isLabelsVisible && entry.labels.length > 0" class="entry-list-row__labels">
          <LabelChip
            v-for="label in entry.labels"
            :key="label.labelId"
            :label="{ name: label.name, color: label.color, icon: null }"
          />
        </span>
      </span>
    </component>
    <button
      v-if="entry.isInRegistry && !isRenaming"
      class="icon-btn entry-list-row__rename"
      type="button"
      :title="t('list.rename')"
      :aria-label="t('list.rename')"
      @click="emit('startRename')"
    >
      <span class="mdi mdi-pencil-outline" />
    </button>
    <button
      v-if="canDuplicate && !isRenaming"
      class="icon-btn entry-list-row__rename"
      type="button"
      :title="t('detail.duplicate')"
      :aria-label="t('detail.duplicate')"
      @click="emit('duplicate')"
    >
      <span class="mdi mdi-content-copy" />
    </button>

    <SwitchToggle
      v-if="canToggle(entry)"
      :model-value="isOn(entry)"
      :label="t('detail.switch')"
      @update:model-value="emit('act', entry, toggleAction(entry))"
    />
    <button
      v-else-if="supportsAction(entry, ENTRY_ACTION.run)"
      class="entry-list-row__run"
      type="button"
      :aria-label="t(`detail.run.${entry.domain}`)"
      :title="t(`detail.run.${entry.domain}`)"
      @click="emit('act', entry, ENTRY_ACTION.run)"
    >
      <span class="mdi mdi-play" />
    </button>
    <span v-else-if="entry.state" class="entry-list-row__state">{{ entry.state }}</span>
  </div>
</template>

<script setup lang="ts">
import { canDuplicate as canDuplicateEntry } from "@/utils/entries/entryActions";
import { computed } from "vue";
import { useI18n } from "vue-i18n";

import InlineNameInput from "@/components/common/InlineNameInput.vue";
import LabelChip from "@/components/labels/LabelChip.vue";
import SwitchToggle from "@/components/common/SwitchToggle.vue";
import { ENTRY_ACTION, ENTRY_KIND_ICON, type EntryAction } from "@/constants/entries";
import type { Entry } from "@/types/entry";
import { usePlainEntityDrag } from "@/composables/dragDrop/usePlainEntityDrag";
import { useLookupsStore } from "@/stores/lookupsStore";
import { setDraggedEntity } from "@/utils/dragDrop";
import { canToggle, isOn, supportsAction, toggleAction } from "@/utils/entries/entryActions";
import AppIcon from "@/components/common/AppIcon.vue";

/** HA's state for a switched-off automation or script. */
const STATE_OFF = "off";
const SUBTITLE_SEPARATOR = " · ";

const props = defineProps<{
  /** Label chips under the name (setting, off by default). */
  isLabelsVisible?: boolean;
  entry: Entry;
  isSelected: boolean;
  isTechnicalDetailsVisible: boolean;
  /** The flow has edits that are not saved to HA yet. */
  hasUnsavedChanges: boolean;
  /** Ticked for moving several entries at once. */
  isChecked: boolean;
  /** Some row is ticked, so every checkbox is shown clearly. */
  isCheckActive: boolean;
  /** The name is an input right now (double click, pencil or F2). */
  isRenaming?: boolean;
  /**
   * In the area view: why the entry is in the selected area, e.g. "über Bewegungsmelder · auch in
   * Garten"; it replaces the area in the subtitle. Undefined outside the area view.
   */
  areaNote?: string;
}>();

const lookups = useLookupsStore();
const drag = usePlainEntityDrag();

const emit = defineEmits<{
  select: [entityId: string];
  act: [entry: Entry, action: EntryAction];
  /** The checkbox was clicked; `withShift` ticks a range. */
  check: [entityId: string, withShift: boolean];
  startRename: [];
  duplicate: [];
  rename: [name: string];
  cancelRename: [];
}>();

const { t } = useI18n();

/** Copies automations, scripts and storage helpers; scenes and template/group helpers not yet. */
const canDuplicate = computed(() => canDuplicateEntry(props.entry));

const isOff = computed(() => props.entry.isDisabled || props.entry.state === STATE_OFF);
/** Without technical details: kind and area, e.g. "Automation · Terrasse". */
const subtitle = computed(() => {
  const where = props.areaNote === undefined ? props.entry.area?.name : props.areaNote;
  const parts = [t(`kind.${props.entry.kind}`), where];

  return parts.filter(Boolean).join(SUBTITLE_SEPARATOR);
});

function startDrag(event: DragEvent): void {
  if (!event.dataTransfer) return;

  // Onto a folder it moves, into a flow it becomes a new block (a copy); the drag has to allow
  // both, or the browser silently refuses one of them.
  event.dataTransfer.effectAllowed = "copyMove";
  setDraggedEntity(event.dataTransfer, props.entry.entityId);

  // Flows read it here (browsers hide the drag data until the drop); only this row, never the
  // ticked ones, which only move together onto a folder
  const option = lookups.entities.find((entity) => entity.entityId === props.entry.entityId);
  if (option) drag.start(option);
}
</script>

<style scoped>
.entry-list-row {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 0 10px 0 8px;
  border: 1px solid transparent;
  border-radius: var(--radius-md);
}

.entry-list-row:hover {
  background: var(--surface);
}

.entry-list-row__check {
  flex: none;
  width: 16px;
  height: 16px;
  margin: 0;
  accent-color: var(--accent);
  cursor: pointer;
  opacity: 0.3;
}

/* Quiet until needed: clear on hover, when ticked, or while any row is ticked. */
.entry-list-row:hover .entry-list-row__check,
.entry-list-row__check:focus-visible,
.entry-list-row--checking .entry-list-row__check {
  opacity: 1;
}

.entry-list-row__check:disabled {
  cursor: default;
  opacity: 0.15;
}

.entry-list-row--checked {
  background: var(--accent-soft);
}

@media (hover: none) {
  .entry-list-row__check {
    opacity: 0.6;
  }
}

.entry-list-row--active {
  background: var(--surface);
  border-color: var(--line-strong);
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
}

.entry-list-row--off .entry-list-row__name {
  color: var(--muted);
}

.entry-list-row__open {
  flex: 1;
  min-width: 0;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 9px 0 9px 10px;
  border: 0;
  border-radius: var(--radius-md);
  background: none;
  text-align: left;
  cursor: pointer;
}

.entry-list-row__icon {
  display: grid;
  place-items: center;
  flex: none;
  width: 32px;
  height: 32px;
  border-radius: 8px;
  font-size: 18px;
}

.entry-list-row__main {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
}

.entry-list-row__name {
  overflow: hidden;
  font-weight: 600;
  white-space: nowrap;
  text-overflow: ellipsis;
}

.entry-list-row__unsaved {
  display: inline-block;
  width: 7px;
  height: 7px;
  margin-left: 4px;
  border-radius: 50%;
  background: var(--warn);
  vertical-align: middle;
}

.entry-list-row__star {
  color: var(--kind-automation);
  font-size: 13px;
}

/* Small and quiet: the labels are extra information, the name stays the main thing. */
.entry-list-row__labels {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  margin-top: 4px;
  font-size: 11px;
}

.entry-list-row__labels :deep(.label-chip) {
  padding: 0 7px;
  font-size: 11px;
}

.entry-list-row__sub {
  overflow: hidden;
  color: var(--faint);
  font-size: 12px;
  white-space: nowrap;
  text-overflow: ellipsis;
}

.entry-list-row__run {
  display: grid;
  place-items: center;
  flex: none;
  width: 28px;
  height: 28px;
  border: 1px solid var(--line-strong);
  border-radius: 50%;
  background: var(--surface);
  color: var(--kind-script);
  cursor: pointer;
  font-size: 16px;
}

.entry-list-row__run:hover {
  background: var(--kind-script-soft);
}

.entry-list-row__state {
  flex: none;
  max-width: 35%;
  overflow: hidden;
  color: var(--muted);
  font-size: 12.5px;
  font-weight: 600;
  white-space: nowrap;
  text-overflow: ellipsis;
}

@media (pointer: coarse) {
  .entry-list-row__open {
    padding-block: 12px;
  }

  .entry-list-row__run {
    width: 36px;
    height: 36px;
  }
}

.entry-list-row__rename {
  width: 28px;
  height: 28px;
  opacity: 0;
  font-size: 16px;
}

.entry-list-row:hover .entry-list-row__rename,
.entry-list-row__rename:focus-visible {
  opacity: 1;
}

@media (hover: none) {
  .entry-list-row__rename {
    display: none;
  }
}
</style>
