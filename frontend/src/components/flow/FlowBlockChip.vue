<template>
  <component
    :is="isButton ? 'button' : 'span'"
    :type="isButton ? 'button' : undefined"
    class="flow-block-chip"
    :class="[
      `flow-block-chip--${kind}`,
      {
        'flow-block-chip--editable': isEditable,
        'flow-block-chip--missing': isMissing,
        'flow-block-chip--gone': isGone,
      },
    ]"
    @click="(event: MouseEvent) => emit('open', event)"
  >
    <span v-if="icon" class="mdi" :class="icon" />
    <span v-if="label" class="flow-block-chip__label">{{ label }}</span>
    {{ text }}
  </component>
</template>

<script setup lang="ts">
import { computed } from "vue";

import type { BlockChip } from "@/types/editor";

/** One chip in a block's sentence: an entity, a value or a text, or "+ Hinzufügen" (`add`). */
const props = defineProps<{
  kind: BlockChip["kind"] | "add";
  text: string;
  /** Field name in front of the value, e.g. "Für mindestens". */
  label?: string;
  /** An mdi icon in front of the text, for "+ Hinzufügen". */
  icon?: string;
  /** Opens the chip's editor when clicked; only while the flow can be edited. */
  isEditable?: boolean;
  isMissing?: boolean;
  isGone?: boolean;
}>();

const emit = defineEmits<{
  /** Clicked; the block opens the editor or the add menu next to the chip. */
  open: [event: MouseEvent];
}>();

/** Editable chips and "+ Hinzufügen" can be clicked; the others are plain text. */
const isButton = computed(() => props.isEditable || props.kind === "add");
</script>

<style scoped>
.flow-block-chip {
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

button.flow-block-chip {
  border: 0;
  color: inherit;
  font-family: inherit;
  line-height: inherit;
  text-align: left;
}

.flow-block-chip--editable {
  cursor: pointer;
  box-shadow: inset 0 -2px 0 var(--line-strong);
  transition: background 0.12s;
}

.flow-block-chip--editable:hover {
  background: var(--line);
}

/* Names an entity HA no longer has (check-up): red. */
.flow-block-chip--gone,
.flow-block-chip--gone.flow-block-chip--entity {
  background: var(--err-soft);
  color: var(--err);
  box-shadow: inset 0 0 0 1.5px var(--err);
}

/* A required value is still empty: outlined in the warning color, like in the click dummy. */
.flow-block-chip--missing,
.flow-block-chip--missing.flow-block-chip--entity {
  background: transparent;
  box-shadow: inset 0 0 0 1.5px var(--warn);
  color: var(--warn);
}

.flow-block-chip--missing.flow-block-chip--editable:hover {
  background: var(--warn-soft);
}

.flow-block-chip--add {
  align-items: center;
  background: transparent;
  color: var(--faint);
  font-weight: 500;
  cursor: pointer;
}

.flow-block-chip--add:hover {
  background: var(--sunken);
  color: var(--fg);
}

.flow-block-chip--entity {
  background: var(--section-soft);
  box-shadow: inset 0 -2px 0 color-mix(in srgb, var(--section-color) 40%, transparent);
}

.flow-block-chip--entity.flow-block-chip--editable:hover {
  background: color-mix(in srgb, var(--section-color) 22%, var(--surface));
}

.flow-block-chip__label {
  /* A long value may wrap; the short label in front of it must not break mid-word. */
  flex: none;
  white-space: nowrap;
  color: var(--muted);
  font-size: 12px;
  font-weight: 500;
}
</style>
