<template>
  <div
    class="flow-block"
    :data-block-id="block.id"
    :class="[
      {
        'flow-block--disabled': block.isDisabled,
        'flow-block--unknown': block.isUnknown,
      },
      runState ? `flow-block--run-${runStatusTone(runState.status)}` : '',
    ]"
  >
    <div class="flow-block__head">
      <span class="flow-block__icon"><span class="mdi" :class="block.icon" /></span>
      <div class="flow-block__sentence">
        <span class="flow-block__title">{{
          isScriptStart ? t("flow.scriptStart.title") : block.title
        }}</span>
        <span
          v-if="isScriptStart"
          class="mdi mdi-information-outline flow-block__info"
          role="img"
          :title="t('flow.scriptStart.hint')"
          :aria-label="t('flow.scriptStart.hint')"
        />
        <FlowBlockChip
          v-for="(chip, index) in block.chips"
          :key="index"
          :kind="chip.kind"
          :text="chip.text"
          :label="chip.label"
          :is-editable="isChipEditable(chip)"
          :is-missing="chip.isMissing"
          :is-gone="chip.isGone"
          @open="(event) => openChip({ chip, event })"
        />
        <FlowBlockChip
          v-if="editing?.isEditable.value && block.addable.length > 0"
          kind="add"
          icon="mdi-plus"
          :text="t('flow.edit.add')"
          @open="openAdd"
        />
        <span v-if="block.isDisabled" class="flow-block__tag">{{ t("flow.disabled") }}</span>
      </div>
      <button
        v-if="editing?.isEditable.value"
        type="button"
        class="icon-btn flow-block__menu"
        :aria-label="t('flow.block.menuLabel')"
        :title="t('flow.block.menuLabel')"
        @click="(event: MouseEvent) => openMenu(event)"
      >
        <span class="mdi mdi-dots-vertical" />
      </button>
    </div>

    <FlowBlockRunNote v-if="runState" :run-state="runState" />

    <p v-if="block.isUnknown" class="flow-block__hint">{{ t("flow.unknownHint") }}</p>
    <pre v-if="block.isUnknown && isTechnicalDetailsVisible" class="flow-block__raw">{{
      rawText
    }}</pre>

    <div
      v-for="(branch, index) in block.branches"
      :key="index"
      class="flow-block__branch"
      :class="{
        'flow-block__branch--drop':
          branchDropKey(branch) !== null && editing?.dropHoverKey.value === branchDropKey(branch),
      }"
      :data-drop-key="branchDropKey(branch) ?? undefined"
    >
      <div v-if="branch.label" class="flow-block__branch-label">{{ branch.label }}</div>
      <FlowBlock
        v-for="child in branch.blocks"
        :key="child.id"
        :block="child"
        :is-technical-details-visible="isTechnicalDetailsVisible"
      />
      <p v-if="branch.blocks.length === 0 && !editing?.isEditable.value" class="flow-block__hint">
        {{ t("flow.emptyBranch") }}
      </p>
      <div v-if="branch.add.length > 0" class="flow-block__adds">
        <AddBlockButton
          v-for="target in branch.add"
          :key="target.listPath.join('.')"
          :target="target"
        />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, inject } from "vue";
import { useI18n } from "vue-i18n";

import { runStatusTone } from "@/composables/texts/useRunTexts";
import type { BlockChip, DisplayBlock, DisplayBranch } from "@/types/editor";
import { dropKey } from "@/utils/flow/dropTargets";
import { isScriptStartBlock } from "@/utils/flow/scriptStart";

import AddBlockButton from "./AddBlockButton.vue";
import FlowBlockChip from "./FlowBlockChip.vue";
import FlowBlockRunNote from "./FlowBlockRunNote.vue";
import { FLOW_EDITING, FLOW_RUN_STATES } from "./flowEditing";

const JSON_INDENT = 2;

/**
 * A branch takes a dropped entity into its list of the block's own kind ("dann" / "sonst" of a
 * Wenn in "Dann"); a Wenn's own conditions are no target (that would be replacing).
 */
function branchDropKey(branch: DisplayBranch): string | null {
  const target = branch.add.find((item) => item.section === props.block.section);

  return target ? dropKey(target) : null;
}

const props = defineProps<{
  block: DisplayBlock;
  isTechnicalDetailsVisible: boolean;
}>();

const { t } = useI18n();

const rawText = computed(() => JSON.stringify(props.block.raw, null, JSON_INDENT));
/** HA names script.turn_on "Einschalten", but it runs the script, only without waiting for it. */
const isScriptStart = computed(() => isScriptStartBlock(props.block.raw));

/** Provided by FlowView; missing only when a block is rendered on its own. */
const editing = inject(FLOW_EDITING, null);

/** Set while a run is shown on the flow: what this block did in it. */
const runStates = inject(FLOW_RUN_STATES, null);
const runState = computed(() => runStates?.value?.get(props.block.id) ?? null);

function isChipEditable(chip: BlockChip): boolean {
  return Boolean(editing?.isEditable.value && chip.edit);
}

function openChip({ chip, event }: { chip: BlockChip; event: MouseEvent }): void {
  if (!editing || !chip.edit || !isChipEditable(chip)) return;

  editing.openEditor({ edit: chip.edit, anchor: event.currentTarget as HTMLElement });
}

function openAdd(event: MouseEvent): void {
  editing?.openAddMenu({ fields: props.block.addable, anchor: event.currentTarget as HTMLElement });
}

function openMenu(event: MouseEvent): void {
  editing?.openBlockMenu({ block: props.block, anchor: event.currentTarget as HTMLElement });
}
</script>

<style scoped>
.flow-block {
  display: grid;
  gap: 6px;
  padding: 9px 12px;
  border: 1px solid var(--line);
  border-radius: 11px;
  background: var(--surface);
}

/* A run shown on the flow: the border says how the block did, a line below says what it did. */
.flow-block--run-ok {
  border-color: color-mix(in srgb, var(--ok) 55%, var(--line));
}

.flow-block--run-warn {
  border-color: color-mix(in srgb, var(--warn) 60%, var(--line));
}

.flow-block--run-err {
  border-color: var(--err);
  box-shadow: 0 0 0 1px var(--err);
}

.flow-block--run-run {
  border-color: var(--accent);
  box-shadow: 0 0 0 1px var(--accent);
}

.flow-block--run-none > .flow-block__head {
  opacity: 0.55;
}

/* The ⋮ menu shows on hover of its own block only (not of every parent), always on touch. */
.flow-block__menu {
  flex: none;
  width: 28px;
  height: 28px;
  margin: -2px -6px 0 0;
  font-size: 18px;
  opacity: 0;
}

.flow-block:hover > .flow-block__head > .flow-block__menu,
.flow-block__menu:focus-visible {
  opacity: 1;
}

@media (hover: none) {
  .flow-block__menu {
    opacity: 1;
  }
}

.flow-block__adds {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.flow-block--disabled {
  border-style: dashed;
  background: var(--surface-2);
}

.flow-block--disabled .flow-block__sentence {
  opacity: 0.55;
}

.flow-block--unknown {
  border-style: dashed;
  border-color: var(--warn);
}

.flow-block__head {
  display: flex;
  align-items: flex-start;
  gap: 10px;
}

.flow-block__icon {
  display: grid;
  place-items: center;
  flex: none;
  width: 28px;
  height: 28px;
  margin-top: 1px;
  border-radius: 7px;
  background: var(--section-soft);
  color: var(--section-color);
  font-size: 17px;
}

.flow-block__sentence {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px;
  line-height: 1.4;
}

.flow-block__title {
  font-weight: 600;
}

.flow-block__info {
  color: var(--text-muted);
  cursor: help;
}

.flow-block__tag {
  padding: 2px 6px;
  border-radius: 5px;
  background: var(--sunken);
  color: var(--muted);
  font-size: 11px;
  font-weight: 700;
}

.flow-block__hint {
  margin: 0;
  color: var(--muted);
  font-size: 12.5px;
}

.flow-block__raw {
  margin: 0;
  padding: 8px 10px;
  overflow-x: auto;
  border-radius: 8px;
  background: var(--sunken);
  font: 12px/1.45 var(--font-mono);
}

.flow-block__branch--drop {
  border-radius: 10px;
  outline: 2px solid var(--accent);
  outline-offset: 3px;
  background: var(--accent-soft);
}

.flow-block__branch {
  display: grid;
  gap: 6px;
  margin-left: 14px;
  padding-left: 14px;
  border-left: 2px solid var(--line);
}

.flow-block__branch-label {
  color: var(--faint);
  font-size: 11.5px;
  font-weight: 700;
  letter-spacing: 0.07em;
  text-transform: uppercase;
}
</style>
