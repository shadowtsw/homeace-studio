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
        <component
          :is="isChipEditable(chip) ? 'button' : 'span'"
          v-for="(chip, index) in block.chips"
          :key="index"
          :type="isChipEditable(chip) ? 'button' : undefined"
          class="flow-block__chip"
          :class="[
            `flow-block__chip--${chip.kind}`,
            {
              'flow-block__chip--editable': isChipEditable(chip),
              'flow-block__chip--missing': chip.isMissing,
              'flow-block__chip--gone': chip.isGone,
            },
          ]"
          @click="(event: MouseEvent) => openChip(chip, event)"
        >
          <span v-if="chip.label" class="flow-block__chip-label">{{ chip.label }}</span>
          {{ chip.text }}
        </component>
        <button
          v-if="editing?.isEditable.value && block.addable.length > 0"
          type="button"
          class="flow-block__chip flow-block__chip--add"
          @click="(event: MouseEvent) => openAdd(event)"
        >
          <span class="mdi mdi-plus" /> {{ t("flow.edit.add") }}
        </button>
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

    <p
      v-if="runState"
      class="flow-block__run"
      :class="`flow-block__run--${runStatusTone(runState.status)}`"
    >
      <span class="flow-block__run-icon">
        <span class="mdi" :class="RUN_STATUS_ICON[runState.status]" />
      </span>
      <span>{{ runState.error ? errorText(runState.error) : noteOf(runState) }}</span>
    </p>

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

import { RUN_STATUS_ICON, runStatusTone, useRunTexts } from "@/composables/useRunTexts";
import type { BlockChip, DisplayBlock, DisplayBranch } from "@/types/editor";
import { dropKey } from "@/utils/flow/dropTargets";
import { isScriptStartBlock } from "@/utils/flow/scriptStart";

import AddBlockButton from "./AddBlockButton.vue";
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
const { noteOf, errorText } = useRunTexts();

function isChipEditable(chip: BlockChip): boolean {
  return Boolean(editing?.isEditable.value && chip.edit);
}

function openChip(chip: BlockChip, event: MouseEvent): void {
  if (!editing || !chip.edit || !isChipEditable(chip)) return;

  editing.openEditor(chip.edit, event.currentTarget as HTMLElement);
}

function openAdd(event: MouseEvent): void {
  editing?.openAddMenu(props.block.addable, event.currentTarget as HTMLElement);
}

function openMenu(event: MouseEvent): void {
  editing?.openBlockMenu(props.block, event.currentTarget as HTMLElement);
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

.flow-block__run {
  display: flex;
  align-items: center;
  gap: 6px;
  margin: 0;
  color: var(--muted);
  font-size: 12.5px;
}

.flow-block__run--err {
  color: var(--err);
}

.flow-block__run-icon {
  display: grid;
  flex: none;
  place-items: center;
  width: 18px;
  height: 18px;
  border-radius: 50%;
  background: var(--sunken);
  font-size: 12px;
}

.flow-block__run--ok .flow-block__run-icon {
  background: var(--ok-soft);
  color: var(--ok);
}

.flow-block__run--warn .flow-block__run-icon {
  background: var(--warn-soft);
  color: var(--warn);
}

.flow-block__run--err .flow-block__run-icon {
  background: var(--err-soft);
  color: var(--err);
}

.flow-block__run--run .flow-block__run-icon {
  background: var(--accent-soft);
  color: var(--accent);
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

.flow-block__chip {
  display: inline-flex;
  align-items: baseline;
  gap: 5px;
  max-width: 100%;
  padding: 2px 9px;
  border-radius: 7px;
  background: var(--sunken);
  font-size: 13.5px;
  font-weight: 600;
  overflow-wrap: anywhere;
}

button.flow-block__chip {
  border: 0;
  color: inherit;
  font-family: inherit;
  line-height: inherit;
  text-align: left;
}

.flow-block__chip--editable {
  cursor: pointer;
  box-shadow: inset 0 -2px 0 var(--line-strong);
  transition: background 0.12s;
}

.flow-block__chip--editable:hover {
  background: var(--line);
}

/* A required value is still empty: outlined in the warning color, like in the click dummy. */
.flow-block__chip--gone,
.flow-block__chip--gone.flow-block__chip--entity {
  background: var(--err-soft);
  color: var(--err);
  box-shadow: inset 0 0 0 1.5px var(--err);
}

.flow-block__chip--missing,
.flow-block__chip--missing.flow-block__chip--entity {
  background: transparent;
  box-shadow: inset 0 0 0 1.5px var(--warn);
  color: var(--warn);
}

.flow-block__chip--missing.flow-block__chip--editable:hover {
  background: var(--warn-soft);
}

.flow-block__chip--add {
  align-items: center;
  background: transparent;
  color: var(--faint);
  font-weight: 500;
  cursor: pointer;
}

.flow-block__chip--add:hover {
  background: var(--sunken);
  color: var(--fg);
}

.flow-block__chip--entity {
  background: var(--section-soft);
  box-shadow: inset 0 -2px 0 color-mix(in srgb, var(--section-color) 40%, transparent);
}

.flow-block__chip--entity.flow-block__chip--editable:hover {
  background: color-mix(in srgb, var(--section-color) 22%, var(--surface));
}

.flow-block__chip-label {
  /* A long value may wrap; the short label in front of it must not break mid-word. */
  flex: none;
  white-space: nowrap;
  color: var(--muted);
  font-size: 12px;
  font-weight: 500;
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
