<template>
  <!-- Plain entities from the list can be dropped on the sections and their branches. -->
  <div
    class="flow-view"
    @dragover="entityDrop.onDragOver"
    @dragleave="entityDrop.onDragLeave"
    @drop="entityDrop.onDrop"
  >
    <p v-if="isLoading" class="flow-view__state">{{ t("flow.loading") }}</p>
    <p v-else-if="hasError" class="flow-view__state flow-view__state--error">
      {{ t("flow.failed") }}
    </p>

    <template v-else-if="flow">
      <p v-if="!isEditable" class="flow-view__banner">
        <span class="mdi mdi-lock-outline" /> {{ t("flow.notEditable") }}
      </p>

      <div class="flow-view__bar">
        <span class="flow-view__bar-label">{{ t(`flow.mode.${kind}`) }}</span>
        <div class="flow-view__modes" role="radiogroup">
          <button
            v-for="mode in FLOW_MODES"
            :key="mode"
            type="button"
            role="radio"
            class="flow-view__mode"
            :class="{ 'flow-view__mode--on': flow.mode === mode }"
            :aria-checked="flow.mode === mode"
            :disabled="!isEditable"
            @click="emit('change', { type: 'set', path: MODE_PATH, value: mode })"
          >
            {{ t(`flow.mode.${mode}`) }}
          </button>
        </div>
      </div>

      <section
        v-for="section in sections"
        :key="section.key"
        class="flow-view__section"
        :class="[
          `flow-view__section--${section.key}`,
          dropSigns[section.key]
            ? `flow-view__section--drop-${dropSigns[section.key]?.isOk ? 'ok' : 'no'}`
            : '',
        ]"
      >
        <div class="flow-view__head">
          <span class="flow-view__keyword">{{ section.title }}</span>
          <small>{{ section.hint }}</small>
          <span
            v-if="dropSigns[section.key]"
            class="flow-view__drop-sign"
            :class="{ 'flow-view__drop-sign--no': !dropSigns[section.key]?.isOk }"
          >
            <span
              class="mdi"
              :class="dropSigns[section.key]?.isOk ? 'mdi-plus-circle-outline' : 'mdi-cancel'"
            />{{ dropSigns[section.key]?.text }}
          </span>
        </div>
        <div
          class="flow-view__blocks"
          :class="{ 'flow-view__blocks--drop': entityDrop.hoverKey.value === dropKey(section.add) }"
          :data-drop-key="dropKey(section.add)"
        >
          <FlowBlock
            v-for="block in section.blocks"
            :key="block.id"
            :block="block"
            :is-technical-details-visible="isTechnicalDetailsVisible"
          />
          <p v-if="section.blocks.length === 0" class="flow-view__empty">{{ section.empty }}</p>
          <AddBlockButton :target="section.add" />
        </div>
      </section>
      <p v-if="isEditable" class="flow-view__note">{{ t("flow.editHint") }}</p>
    </template>

    <ChipEditorPopover
      v-if="openEdit"
      :key="openEdit.key"
      :edit="openEdit.edit"
      :anchor="openEdit.anchor"
      :is-technical-details-visible="isTechnicalDetailsVisible"
      :used-ids="usedEntityIds"
      :area-id="areaId"
      @apply="apply"
      @apply-area="(areaPath, areaId) => applyArea({ areaPath, areaId })"
      @close="close"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, provide, toRef, watch } from "vue";
import { useI18n } from "vue-i18n";

import { useFlowEntityDrop } from "@/composables/dragDrop/useFlowEntityDrop";
import { useFlowPopover } from "@/composables/flow/useFlowPopover";
import { useFlowSections } from "@/composables/flow/useFlowSections";
import {
  FLOW_MODES,
  type ConfigPath,
  type DisplayFlow,
  type EditorCatalog,
  type FlowChange,
  type FlowKind,
} from "@/types/editor";
import { dropKey } from "@/utils/flow/dropTargets";
import { entityIdsInFlow } from "@/utils/flow/entityIdsInFlow";
import type { BlockRunState } from "@/utils/runs/runStates";

import AddBlockButton from "./AddBlockButton.vue";
import ChipEditorPopover from "./ChipEditorPopover.vue";
import FlowBlock from "./FlowBlock.vue";
import { FLOW_EDITING, FLOW_RUN_STATES } from "./flowEditing";

const MODE_PATH: ConfigPath = ["mode"];

const props = defineProps<{
  /** The open entry; switching it closes an open editor. */
  entityId: string;
  flow: DisplayFlow | null;
  kind: FlowKind;
  isLoading: boolean;
  hasError: boolean;
  isEditable: boolean;
  isTechnicalDetailsVisible: boolean;
  /** Block types for adding; null until HA sent them (then only hand-made ones are offered). */
  catalog: EditorCatalog | null;
  /** The entry's area, for suggestions in the entity picker. */
  areaId: string | null;
  /** A run shown on the blocks ("Im Ablauf zeigen"); null for the plain flow. */
  runStates?: ReadonlyMap<string, BlockRunState> | null;
}>();

const emit = defineEmits<{
  /** One change to the flow. Only the draft changes, not HA. */
  change: [change: FlowChange];
}>();

const { t } = useI18n();

// The popover: value editors and the menus of the blocks
const {
  openEdit,
  openEditor,
  openMenu,
  openAddMenu,
  openBlockMenu,
  openTypePicker,
  closeAndEmit,
  close,
  apply,
  applyArea,
} = useFlowPopover({
  catalog: toRef(props, "catalog"),
  isTechnicalDetailsVisible: toRef(props, "isTechnicalDetailsVisible"),
  onChange: (change) => emit("change", change),
});

// Plain entities dropped from the list, and the sections they land in
const entityDrop = useFlowEntityDrop({
  flow: toRef(props, "flow"),
  selfId: toRef(props, "entityId"),
  isEditable: toRef(props, "isEditable"),
  catalog: toRef(props, "catalog"),
  openMenu,
  // Closes the menu the choice came from, then sends the change
  emitChange: closeAndEmit,
});
const { sections, dropSigns } = useFlowSections({
  flow: toRef(props, "flow"),
  kind: toRef(props, "kind"),
  signFor: entityDrop.signFor,
});

/** Every entity the flow names, for the picker's suggestions. */
const usedEntityIds = computed(() => (props.flow ? entityIdsInFlow(props.flow) : []));

// What nested blocks need from here
provide(
  FLOW_RUN_STATES,
  computed(() => props.runStates ?? null),
);
provide(FLOW_EDITING, {
  isEditable: toRef(props, "isEditable"),
  openEditor,
  openAddMenu,
  openBlockMenu,
  openTypePicker,
  dropHoverKey: entityDrop.hoverKey,
});

// Another entry is open: the editor would point at the old one.
watch(() => props.entityId, close);
</script>

<style scoped>
.flow-view__state {
  color: var(--muted);
}

.flow-view__state--error {
  color: var(--err);
}

.flow-view__banner {
  display: flex;
  gap: 8px;
  margin: 0 0 16px;
  padding: 10px 12px;
  border: 1px dashed var(--line-strong);
  border-radius: 10px;
  background: var(--surface);
  color: var(--muted);
  font-size: 13px;
}

.flow-view__bar {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 10px;
  margin-bottom: 22px;
  padding: 10px 12px;
  border: 1px solid var(--line);
  border-radius: 10px;
  background: var(--surface);
}

.flow-view__bar-label {
  color: var(--muted);
  font-size: 12.5px;
}

.flow-view__modes {
  display: flex;
  gap: 2px;
  padding: 3px;
  overflow-x: auto;
  border-radius: 9px;
  background: var(--sunken);
}

.flow-view__mode {
  padding: 5px 9px;
  border: 0;
  border-radius: 7px;
  background: transparent;
  color: var(--muted);
  font-size: 12.5px;
  font-weight: 600;
  white-space: nowrap;
  cursor: pointer;
}

.flow-view__mode:disabled {
  cursor: default;
}

.flow-view__mode--on {
  background: var(--surface);
  color: var(--fg);
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.08);
}

/* Each section has its color; blocks and chips inside take it from these variables. */
.flow-view__section {
  --section-color: var(--accent);
  --section-soft: var(--accent-soft);

  position: relative;
  padding: 0 0 24px 30px;
}

.flow-view__section--when {
  --section-color: var(--kind-automation);
  --section-soft: var(--kind-automation-soft);
}

.flow-view__section--if {
  --section-color: var(--kind-helper);
  --section-soft: var(--kind-helper-soft);
}

/* While an entity is dragged: fitting sections light up, the others step back. */
.flow-view__section--drop-ok > .flow-view__blocks {
  outline: 2px dashed var(--section-color);
  outline-offset: 6px;
  border-radius: 12px;
  background: color-mix(in srgb, var(--section-soft) 60%, transparent);
}

.flow-view__section--drop-ok > .flow-view__blocks--drop {
  outline-style: solid;
  background: var(--section-soft);
}

.flow-view__section--drop-no > .flow-view__blocks {
  opacity: 0.35;
}

/* The sign floats: showing or removing it never moves the blocks under the pointer. */
.flow-view__drop-sign {
  position: absolute;
  top: -3px;
  right: 0;
  z-index: 2;
  display: inline-flex;
  align-items: center;
  gap: 5px;
  max-width: calc(100% - 150px);
  padding: 3px 10px;
  border-radius: 999px;
  background: var(--section-color);
  color: #fff;
  font-size: 12px;
  font-weight: 600;
  line-height: 1.4;
}

.flow-view__drop-sign--no {
  background: var(--sunken);
  color: var(--muted);
  font-weight: 500;
}

/* The spine on the left that ties the sections together. */
.flow-view__section::before {
  content: "";
  position: absolute;
  top: 30px;
  bottom: 4px;
  left: 11px;
  width: 2px;
  border-radius: 2px;
  background: color-mix(in srgb, var(--section-color) 38%, transparent);
}

.flow-view__head {
  display: flex;
  align-items: baseline;
  gap: 10px;
  margin: 0 0 10px -30px;
}

.flow-view__keyword {
  padding: 6px 10px;
  border-radius: 7px;
  background: var(--section-color);
  color: var(--on-accent);
  font: 700 12.5px/1 var(--font-display);
  letter-spacing: 0.07em;
  text-transform: uppercase;
}

.flow-view__head small {
  color: var(--muted);
  font-size: 13px;
}

.flow-view__blocks {
  display: grid;
  gap: 8px;
}

.flow-view__empty,
.flow-view__note {
  margin: 0;
  color: var(--muted);
  font-size: 13px;
}

.flow-view__note {
  color: var(--faint);
}

@media (max-width: 820px) {
  .flow-view__section {
    padding-left: 22px;
  }

  .flow-view__head {
    margin-left: -22px;
  }

  .flow-view__section::before {
    left: 8px;
  }
}
</style>
