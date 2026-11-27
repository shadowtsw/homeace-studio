<template>
  <label class="color-field" :class="{ 'color-field--off': disabled }">
    <span class="color-field__label">{{ label }}</span>
    <input
      class="color-field__picker"
      type="color"
      :value="value"
      :disabled="disabled"
      :aria-label="label"
      @input="pick"
    />
    <input
      v-model="typed"
      class="color-field__hex"
      :class="{ 'color-field__hex--invalid': isInvalid }"
      :disabled="disabled"
      :aria-label="t('settings.appearance.editor.hexLabel', { color: label })"
      :aria-invalid="isInvalid"
      maxlength="7"
      spellcheck="false"
      @input="takeTyped"
      @blur="typed = value"
    />
    <small v-if="isInvalid" class="color-field__hint">
      {{ t("settings.appearance.editor.invalidHex") }}
    </small>
  </label>
</template>

<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { useI18n } from "vue-i18n";

import { isHexColor } from "@/core/themes/color";

/**
 * One colour of the editor: a colour picker and the code as text. A typed code counts only once it
 * is a full `#rrggbb`; until then the field says so and the colour stays as it was.
 */
const props = defineProps<{
  label: string;
  value: string;
  disabled?: boolean;
}>();

const emit = defineEmits<{ update: [value: string] }>();

const { t } = useI18n();
const typed = ref(props.value);
const isInvalid = computed(() => typed.value !== props.value && !isHexColor(typed.value));

// A picked colour, a suggestion or a derived value changes the field too
watch(
  () => props.value,
  (value) => {
    typed.value = value;
  },
);

function pick(event: Event): void {
  emit("update", (event.target as HTMLInputElement).value);
}

function takeTyped(): void {
  const code = typed.value.trim();
  if (isHexColor(code)) emit("update", code.toLowerCase());
}
</script>

<style scoped>
.color-field {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 34px 92px;
  align-items: center;
  gap: 4px 8px;
  padding: 4px 0;
  font-size: 13px;
}

.color-field--off {
  opacity: 0.55;
}

.color-field__picker {
  width: 34px;
  height: 28px;
  padding: 0;
  border: 1px solid var(--line-strong);
  border-radius: 7px;
  background: none;
  cursor: pointer;
}

.color-field__hex {
  height: 28px;
  padding: 0 8px;
  border: 1px solid var(--line-strong);
  border-radius: 7px;
  background: var(--surface);
  color: var(--fg);
  font: 12.5px var(--font-mono);
}

.color-field__hex--invalid {
  border-color: var(--err);
}

.color-field__hint {
  grid-column: 1 / -1;
  color: var(--err);
  font-size: 11.5px;
  text-align: right;
}
</style>
