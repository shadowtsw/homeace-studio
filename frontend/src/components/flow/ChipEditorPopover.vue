<template>
  <Teleport to="body">
    <div
      ref="popover"
      class="chip-editor"
      :class="{
        'chip-editor--sheet': isNarrow,
        'chip-editor--wide': editor.type === 'entity',
        'chip-editor--menu': isLongMenu,
      }"
      :style="positionStyle"
      role="dialog"
      :aria-label="edit.title"
      @keydown.esc.stop="emit('close')"
    >
      <div class="chip-editor__head">
        <div class="chip-editor__title">{{ edit.title }}</div>
        <PopoverClose @close="emit('close')" />
      </div>

      <EntityPicker
        v-if="editor.type === 'entity'"
        :entities="lookups.entities"
        :selected="selected"
        :domains="editor.domains"
        :used-ids="usedIds"
        :area-id="areaId"
        :can-pick-area="editor.areaPath !== undefined"
        :is-technical-details-visible="isTechnicalDetailsVisible"
        @pick="pick"
        @pick-area="pickArea"
      />

      <ChoiceList
        v-else-if="listOptions"
        :options="listOptions"
        :selected="selected"
        :is-multiple="isMultiple"
        :is-searchable="listOptions.length > SEARCH_FROM"
        @pick="pick"
      />

      <div v-else-if="editor.type === 'duration'" class="chip-editor__duration">
        <label v-for="part in DURATION_PARTS" :key="part">
          <input
            v-model.number="duration[part]"
            class="field-input"
            type="number"
            min="0"
            @keydown.enter="applyInput"
          />
          <span>{{ t(`flow.units.${part}`) }}</span>
        </label>
      </div>

      <template v-else-if="editor.type === 'template' || isMultiline">
        <textarea
          ref="firstInput"
          v-model="text"
          class="field-input chip-editor__area"
          :class="{ mono: editor.type === 'template' }"
          rows="4"
          spellcheck="false"
        />
        <p v-if="editor.type === 'template'" class="chip-editor__hint">
          {{ t("flow.edit.templateHint") }}
        </p>
      </template>

      <div v-else class="chip-editor__row">
        <input
          ref="firstInput"
          v-model="text"
          class="field-input"
          :type="inputType"
          :step="inputStep"
          :min="editor.type === 'number' ? editor.min : undefined"
          :max="editor.type === 'number' ? editor.max : undefined"
          autocomplete="off"
          @keydown.enter="applyInput"
        />
        <span v-if="editor.type === 'number' && editor.unit" class="chip-editor__unit">
          {{ editor.unit }}
        </span>
      </div>

      <template v-if="suggestions.length > 0">
        <div class="chip-editor__subtitle">{{ t("flow.edit.suggestions") }}</div>
        <div class="chip-editor__suggestions">
          <button
            v-for="suggestion in suggestions"
            :key="suggestion.value"
            type="button"
            class="chip-editor__suggestion"
            :class="{ 'chip-editor__suggestion--on': suggestion.value === text }"
            @click="emit('apply', suggestion.value)"
          >
            {{ suggestion.label }}
          </button>
        </div>
      </template>

      <div v-if="canRemove || needsApply" class="chip-editor__buttons">
        <button v-if="canRemove" type="button" class="btn" @click="emit('apply', undefined)">
          {{ t("flow.edit.remove") }}
        </button>
        <button v-if="needsApply" type="button" class="btn btn--primary" @click="applyInput">
          {{ t("flow.edit.apply") }}
        </button>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { onClickOutside, useMediaQuery } from "@vueuse/core";
import { nextTick, onMounted, ref, toRef } from "vue";
import { useI18n } from "vue-i18n";

import PopoverClose from "@/components/common/PopoverClose.vue";
import { useChipEditorValue } from "@/composables/flow/useChipEditorValue";
import { useAnchoredPlacement } from "@/composables/panels/useAnchoredPlacement";
import { useLookupsStore } from "@/stores/lookupsStore";
import type { ChipEdit, ConfigPath } from "@/types/editor";

import ChoiceList from "./ChoiceList.vue";
import EntityPicker from "./EntityPicker.vue";

const props = defineProps<{
  edit: ChipEdit;
  /** The clicked chip; the popover opens next to it. */
  anchor: HTMLElement;
  isTechnicalDetailsVisible: boolean;
  /** Entities the flow already uses, suggested first by the entity picker. */
  usedIds: string[];
  /** The automation's area, for suggestions. */
  areaId: string | null;
}>();

const emit = defineEmits<{
  /** The new value; undefined removes it. */
  apply: [value: unknown];
  /** A whole area instead of entities, at the target's area path. */
  applyArea: [areaPath: ConfigPath, areaId: string];
  close: [];
}>();

const { t } = useI18n();
const lookups = useLookupsStore();

/** Lists get a search field from this length on. */
const SEARCH_FROM = 8;
const DURATION_PARTS = ["hours", "minutes", "seconds"] as const;

const popover = ref<HTMLElement | null>(null);
const firstInput = ref<HTMLInputElement | HTMLTextAreaElement | null>(null);
/** On phones the editor is a sheet at the bottom instead of a popover. */
const isNarrow = useMediaQuery("(max-width: 560px)");

const {
  editor,
  isLongMenu,
  isMultiline,
  isMultiple,
  selected,
  text,
  duration,
  listOptions,
  suggestions,
  inputType,
  inputStep,
  canRemove,
  needsApply,
  pick,
  pickArea,
  applyInput,
} = useChipEditorValue({
  edit: toRef(props, "edit"),
  onApply: (value) => emit("apply", value),
  onApplyArea: ({ areaPath, areaId }) => emit("applyArea", areaPath, areaId),
  onClose: () => emit("close"),
});

// A click on the chip itself reopens the editor (FlowView handles it), so it is not "outside".
onClickOutside(popover, () => emit("close"), { ignore: [toRef(props, "anchor")] });
const { place, positionStyle } = useAnchoredPlacement({
  panel: popover,
  anchor: toRef(props, "anchor"),
  isSheet: isNarrow,
});

onMounted(async () => {
  // The entity list, where this editor needs it
  const current = editor.value;

  if (current.type === "entity" || (current.type === "text" && current.stateOf)) {
    void lookups.loadEntities();
  }

  // Next to the chip, then ready to type
  await nextTick();
  place();
  // preventScroll: focusing must not shift the panes (their overflow is hidden, but still scrollable).
  firstInput.value?.focus({ preventScroll: true });
  if (firstInput.value instanceof HTMLInputElement) firstInput.value.select();
});
</script>

<style scoped>
/* The entity picker: one fixed height, so opening a criterion does not change the size. */
.chip-editor--wide {
  width: 440px;
  height: min(460px, 75vh);
}

/* A column: title, search and buttons stay in view, only the list in between scrolls. */
.chip-editor {
  position: fixed;
  z-index: 100;
  display: flex;
  flex-direction: column;
  gap: 8px;
  width: 320px;
  max-width: calc(100vw - 24px);
  max-height: min(460px, 75vh);
  overflow: hidden;
  padding: 10px;
  border: 1px solid var(--line-strong);
  border-radius: 12px;
  background: var(--surface);
  box-shadow: var(--shadow);
}

/* Long menus: wide, two columns, and only the list scrolls (search and title stay). */
.chip-editor--menu {
  display: flex;
  flex-direction: column;
  width: 520px;
  max-height: min(640px, 82vh);
  overflow: hidden;
}

.chip-editor--menu :deep(.choice-list) {
  display: flex;
  flex-direction: column;
  min-height: 0;
}

.chip-editor--menu :deep(.choice-list__items) {
  flex: 1;
  grid-template-columns: repeat(auto-fill, minmax(210px, 1fr));
  align-content: start;
  min-height: 0;
  max-height: none;
}

.chip-editor--menu :deep(.choice-list__main small) {
  font-family: var(--font-body);
}

.chip-editor--sheet {
  left: 12px;
  right: 12px;
  bottom: calc(12px + env(safe-area-inset-bottom, 0px));
  width: auto;
  max-width: none;
}

.chip-editor__title,
.chip-editor__subtitle {
  color: var(--faint);
  font-size: 11.5px;
  font-weight: 700;
  letter-spacing: 0.07em;
  text-transform: uppercase;
}

.chip-editor__head {
  display: flex;
  align-items: flex-start;
  gap: 8px;
}

.chip-editor__title {
  padding: 2px 2px 0;
}

.chip-editor__row {
  display: flex;
  align-items: center;
  gap: 8px;
}

.chip-editor__unit {
  color: var(--muted);
  font-weight: 600;
}

.chip-editor__duration {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 8px;
}

.chip-editor__duration label {
  display: grid;
  gap: 3px;
  color: var(--muted);
  font-size: 12px;
  text-align: center;
}

.chip-editor__area {
  height: auto;
  min-height: 90px;
  padding: 8px 10px;
  resize: vertical;
  line-height: 1.45;
}

.chip-editor__area.mono {
  font-size: 12.5px;
}

.chip-editor__hint {
  margin: 0;
  color: var(--muted);
  font-size: 12px;
}

.chip-editor__suggestions {
  display: flex;
  flex-wrap: wrap;
  gap: 5px;
}

.chip-editor__suggestion {
  padding: 4px 10px;
  border: 1px solid var(--line);
  border-radius: 999px;
  background: var(--surface);
  color: var(--muted);
  font-size: 12.5px;
  cursor: pointer;
}

.chip-editor__suggestion:hover {
  border-color: var(--line-strong);
  color: var(--fg);
}

.chip-editor__suggestion--on {
  border-color: var(--fg);
  background: var(--fg);
  color: var(--bg);
}

.chip-editor > * {
  flex: none;
}

.chip-editor > .entity-picker,
.chip-editor > .choice-list {
  display: flex;
  flex: 1 1 auto;
  flex-direction: column;
  min-height: 0;
}

.chip-editor :deep(.entity-picker__list),
.chip-editor :deep(.choice-list__items) {
  flex: 1 1 auto;
  min-height: 0;
  max-height: none;
}

.chip-editor__buttons {
  display: flex;
  justify-content: flex-end;
  gap: 6px;
}
</style>
