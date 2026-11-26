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
      @apply="onApply"
      @apply-area="onApplyArea"
      @close="openEdit = null"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, provide, ref, toRef, watch } from "vue";
import { useI18n } from "vue-i18n";

import { useFlowEntityDrop } from "@/composables/dragDrop/useFlowEntityDrop";
import { useFlowTexts } from "@/composables/texts/useFlowTexts";
import {
  FLOW_MODES,
  type AddTarget,
  type ChipEdit,
  type ChoiceOption,
  type ConfigPath,
  type DisplayBlock,
  type DisplayFlow,
  type EditorCatalog,
  type FlowChange,
  type FlowKind,
} from "@/types/editor";
import { blockTypes, newBlock } from "@/utils/flow/blockTypes";
import { dropKey } from "@/utils/flow/dropTargets";
import { entityIdsInFlow } from "@/utils/flow/entityIdsInFlow";
import type { BlockRunState } from "@/utils/runs/runStates";

import AddBlockButton from "./AddBlockButton.vue";
import ChipEditorPopover from "./ChipEditorPopover.vue";
import FlowBlock from "./FlowBlock.vue";
import { FLOW_EDITING, FLOW_RUN_STATES } from "./flowEditing";

type Section = {
  key: "when" | "if" | "then";
  title: string;
  hint: string;
  empty: string;
  blocks: DisplayBlock[];
  add: AddTarget;
};

/**
 * The open popover. Without `onPick` it edits the value at `edit.path`; menus (block menu, type
 * picker, "+ Option") set `onPick` to handle the choice themselves. `key` remounts the popover
 * for every new opening.
 */
type OpenEdit = {
  key: number;
  edit: ChipEdit;
  anchor: HTMLElement;
  onPick?: (value: string) => void;
};

/** Block menu actions, as the values of its choice list. */
const BLOCK_ACTION = {
  up: "up",
  down: "down",
  duplicate: "duplicate",
  toggle: "toggle",
  remove: "remove",
} as const;

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

const { t, te } = useI18n();
const flowTexts = useFlowTexts();

const openEdit = ref<OpenEdit | null>(null);
let nextKey = 1;

function openEditor(edit: ChipEdit, anchor: HTMLElement): void {
  openEdit.value = { key: nextKey++, edit, anchor };
}

/** A popover that is just a list to pick from; `onPick` gets the value of the chosen option. */
function openMenu(
  title: string,
  options: ChoiceOption[],
  anchor: HTMLElement,
  onPick: (value: string) => void,
): void {
  const menu: ChipEdit = {
    path: [],
    title,
    editor: { type: "choice", options, isMultiple: false },
    value: undefined,
    isRemovable: false,
  };

  openEdit.value = { key: nextKey++, edit: menu, anchor, onPick };
}

/** "+ Option": pick a field, then its editor opens at the same place. */
function openAddMenu(fields: ChipEdit[], anchor: HTMLElement): void {
  const options = fields.map((field, index) => ({ value: String(index), label: field.title }));

  openMenu(t("flow.edit.add"), options, anchor, (value) => {
    const field = fields[Number(value)];
    if (field) openEditor(field, anchor);
  });
}

function openBlockMenu(block: DisplayBlock, anchor: HTMLElement): void {
  const { listPath, index, count } = block.position;
  const options: ChoiceOption[] = [
    ...(index > 0
      ? [{ value: BLOCK_ACTION.up, label: t("flow.block.up"), icon: "mdi-arrow-up" }]
      : []),
    ...(index < count - 1
      ? [{ value: BLOCK_ACTION.down, label: t("flow.block.down"), icon: "mdi-arrow-down" }]
      : []),
    { value: BLOCK_ACTION.duplicate, label: t("flow.block.duplicate"), icon: "mdi-content-copy" },
    {
      value: BLOCK_ACTION.toggle,
      label: block.isDisabled ? t("flow.block.enable") : t("flow.block.disable"),
      icon: block.isDisabled ? "mdi-play-circle-outline" : "mdi-pause-circle-outline",
    },
    {
      value: BLOCK_ACTION.remove,
      label: t("flow.block.remove"),
      icon: "mdi-delete-outline",
      isDanger: true,
    },
  ];

  openMenu(t("flow.block.menu"), options, anchor, (value) => {
    closeAndEmit(blockChange(value, listPath, index));
  });
}

function blockChange(action: string, listPath: ConfigPath, index: number): FlowChange | null {
  switch (action) {
    case BLOCK_ACTION.up:
      return { type: "move", listPath, from: index, to: index - 1 };
    case BLOCK_ACTION.down:
      return { type: "move", listPath, from: index, to: index + 1 };
    case BLOCK_ACTION.duplicate:
      return { type: "duplicate", listPath, index };
    case BLOCK_ACTION.toggle:
      return { type: "toggle", listPath, index };
    case BLOCK_ACTION.remove:
      return { type: "remove", listPath, index };
    default:
      return null;
  }
}

/** Hand-made types first, then everything HA describes; the search field finds the rest. */
function openTypePicker(target: AddTarget, anchor: HTMLElement): void {
  const types = blockTypes(target.section, props.catalog, flowTexts.value.titles);
  // "Einschalten" exists for lights, switches and scripts alike; the kind tells them apart.
  const labelCount = new Map<string, number>();
  for (const type of types) labelCount.set(type.label, (labelCount.get(type.label) ?? 0) + 1);
  const kindOf = (key: string): string | undefined => {
    const domain = key.split(".")[0] ?? "";
    return te(`picker.kinds.${domain}`) ? t(`picker.kinds.${domain}`) : undefined;
  };
  const options = types.map((type, index) => ({
    value: String(index),
    label: type.label,
    icon: type.icon,
    sub: props.isTechnicalDetailsVisible
      ? type.key
      : (labelCount.get(type.label) ?? 0) > 1
        ? kindOf(type.key)
        : undefined,
  }));

  openMenu(t(`flow.addTitle.${target.section}`), options, anchor, (value) => {
    const type = types[Number(value)];
    if (!type) return;

    closeAndEmit({
      type: "insert",
      listPath: target.listPath,
      item: newBlock(target.section, type, props.catalog),
    });
  });
}

function closeAndEmit(change: FlowChange | null): void {
  openEdit.value = null;
  if (change) emit("change", change);
}

/** Every entity the flow names, for the picker's suggestions. */
const usedEntityIds = computed(() => (props.flow ? entityIdsInFlow(props.flow) : []));

/** "All lights in the living room": the target gets the area, its entity list goes. */
function onApplyArea(areaPath: ConfigPath, areaId: string): void {
  const current = openEdit.value;

  if (!current) return;

  closeAndEmit({ type: "set", path: areaPath, value: areaId });
  emit("change", { type: "set", path: current.edit.path, value: undefined });
}

function onApply(value: unknown): void {
  const current = openEdit.value;

  if (!current) return;

  if (current.onPick) {
    current.onPick(String(value));
    return;
  }

  closeAndEmit({ type: "set", path: current.edit.path, value });
}

const entityDrop = useFlowEntityDrop({
  flow: toRef(props, "flow"),
  selfId: toRef(props, "entityId"),
  isEditable: toRef(props, "isEditable"),
  catalog: toRef(props, "catalog"),
  openMenu,
  // Closes the menu the choice came from, then sends the change
  emitChange: closeAndEmit,
});

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
watch(
  () => props.entityId,
  () => (openEdit.value = null),
);

/** The sign of each section while an entity is dragged; none otherwise. */
const dropSigns = computed(() =>
  Object.fromEntries(
    sections.value.map((section) => [section.key, entityDrop.signFor(section.add.section)]),
  ),
);

const sections = computed((): Section[] => {
  const flow = props.flow;

  if (!flow) return [];

  const actions: Section = {
    key: "then",
    title: props.kind === "script" ? t("flow.sequence") : t("flow.thenSection"),
    hint: t("flow.thenHint"),
    empty: t("flow.noActions"),
    blocks: flow.actions,
    add: flow.add.actions,
  };

  // Scripts have no triggers or conditions of their own, only a sequence.
  if (props.kind === "script") return [actions];

  return [
    {
      key: "when",
      title: t("flow.when"),
      hint: t("flow.whenHint"),
      empty: t("flow.noTriggers"),
      blocks: flow.triggers,
      add: flow.add.triggers,
    },
    {
      key: "if",
      title: t("flow.if"),
      hint: t("flow.ifHint"),
      empty: t("flow.noConditions"),
      blocks: flow.conditions,
      add: flow.add.conditions,
    },
    actions,
  ];
});
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
