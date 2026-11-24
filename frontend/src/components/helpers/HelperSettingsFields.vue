<template>
  <p v-if="fields.length === 0 && type !== 'input_select'" class="helper-settings__none">
    {{ t("helper.fields.none") }}
  </p>

  <div v-if="fields.length" class="helper-settings__grid">
    <label v-for="field in fields" :key="field.key" class="helper-settings__field">
      <span class="field-label">{{ t(`helper.fields.${field.label}`) }}</span>

      <select
        v-if="field.kind === 'choice'"
        v-model="settings[field.key]"
        class="field-input"
        :class="{ 'is-invalid': isInvalid(field.key) }"
        :aria-invalid="isInvalid(field.key) || undefined"
      >
        <option v-for="choice in field.choices" :key="choice" :value="choice">
          {{ t(`helper.choices.${choice}`) }}
        </option>
      </select>
      <span
        v-else-if="field.kind === 'toggle'"
        class="helper-settings__toggle"
        :class="{ 'is-invalid': isInvalid(field.key) }"
      >
        <input
          v-model="settings[field.key]"
          type="checkbox"
          :aria-invalid="isInvalid(field.key) || undefined"
        />
        {{ t(`helper.fields.${field.label}Hint`) }}
      </span>
      <input
        v-else-if="field.kind === 'number'"
        v-model.number="settings[field.key]"
        class="field-input"
        :class="{ 'is-invalid': isInvalid(field.key) }"
        :aria-invalid="isInvalid(field.key) || undefined"
        type="number"
        :step="field.step ?? 'any'"
      />
      <input
        v-else
        v-model="settings[field.key]"
        class="field-input"
        :class="{ 'is-invalid': isInvalid(field.key) }"
        :aria-invalid="isInvalid(field.key) || undefined"
        :placeholder="field.placeholder"
      />
    </label>
  </div>

  <div v-if="type === 'input_select'" class="helper-settings__options">
    <span class="field-label">{{ t("helper.fields.options") }}</span>
    <div v-for="(_, index) in options" :key="index" class="helper-settings__option">
      <input
        v-model="options[index]"
        class="field-input"
        :class="{ 'is-invalid': badOptions.includes(index) }"
        :aria-invalid="badOptions.includes(index) || undefined"
        :aria-label="t('helper.fields.options')"
      />
      <button
        class="icon-btn"
        type="button"
        :aria-label="t('helper.fields.removeOption')"
        :disabled="options.length <= 1"
        @click="options.splice(index, 1)"
      >
        <span class="mdi mdi-delete-outline" />
      </button>
    </div>
    <button class="btn" type="button" @click="options.push('')">
      <span class="mdi mdi-plus" /> {{ t("helper.fields.addOption") }}
    </button>
  </div>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { useI18n } from "vue-i18n";

import type { HelperSettings, HelperType } from "@/constants/helpers";
import { badOptionIndexes } from "@/utils/helperSettings";

type Field = {
  key: string;
  /** Key under helper.fields in the locale files. */
  label: string;
  kind: "number" | "text" | "choice" | "toggle";
  choices?: string[];
  step?: number;
  placeholder?: string;
};

/** Which inputs each helper type needs; mirrors backend/src/helpers/helper-payload.ts. */
const FIELDS: Record<HelperType, Field[]> = {
  input_boolean: [],
  input_button: [],
  input_number: [
    { key: "min", label: "min", kind: "number" },
    { key: "max", label: "max", kind: "number" },
    { key: "step", label: "step", kind: "number" },
    { key: "unitOfMeasurement", label: "unit", kind: "text", placeholder: "%" },
    { key: "mode", label: "mode", kind: "choice", choices: ["slider", "box"] },
  ],
  input_text: [
    { key: "min", label: "textMin", kind: "number", step: 1 },
    { key: "max", label: "textMax", kind: "number", step: 1 },
    { key: "mode", label: "textMode", kind: "choice", choices: ["text", "password"] },
    { key: "pattern", label: "pattern", kind: "text" },
  ],
  input_select: [],
  input_datetime: [
    { key: "hasDate", label: "hasDate", kind: "toggle" },
    { key: "hasTime", label: "hasTime", kind: "toggle" },
  ],
  counter: [
    { key: "initial", label: "initial", kind: "number", step: 1 },
    { key: "step", label: "step", kind: "number", step: 1 },
    { key: "minimum", label: "minimum", kind: "number", step: 1 },
    { key: "maximum", label: "maximum", kind: "number", step: 1 },
    { key: "restore", label: "restore", kind: "toggle" },
  ],
  timer: [
    { key: "duration", label: "duration", kind: "text", placeholder: "00:05:00" },
    { key: "restore", label: "timerRestore", kind: "toggle" },
  ],
};

const settings = defineModel<HelperSettings>({ required: true });

const props = defineProps<{
  type: HelperType;
  /** Fields to mark as wrong (red border, aria-invalid), e.g. ["min", "max"]. */
  invalidFields?: readonly string[];
}>();

const { t } = useI18n();

const fields = computed(() => FIELDS[props.type]);

/** The options list of input_select, edited in place inside the settings object. */
const options = computed(() => {
  const value = settings.value.options;

  return Array.isArray(value) ? value : [];
});

function isInvalid(key: string): boolean {
  return props.invalidFields?.includes(key) ?? false;
}

/** Empty or doubled options, marked only while "options" is a field to mark. */
const badOptions = computed(() =>
  isInvalid("options") ? badOptionIndexes(options.value.map(String)) : [],
);
</script>

<style scoped>
.helper-settings__none {
  margin: 0;
  color: var(--muted);
  font-size: 13px;
}

.helper-settings__grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
}

.helper-settings__field {
  display: grid;
  gap: 5px;
}

.helper-settings__toggle {
  display: flex;
  align-items: center;
  gap: 8px;
  min-height: 36px;
  color: var(--muted);
  font-size: 13px;
}

.helper-settings__options {
  display: grid;
  gap: 8px;
  justify-items: start;
}

.helper-settings__option {
  display: flex;
  gap: 6px;
  width: 100%;
}

@media (max-width: 520px) {
  .helper-settings__grid {
    grid-template-columns: minmax(0, 1fr);
  }
}

.field-input.is-invalid,
.helper-settings__toggle.is-invalid {
  border-color: var(--err);
  box-shadow: 0 0 0 1px var(--err);
}

.helper-settings__toggle.is-invalid {
  border-radius: 8px;
  padding-inline: 6px;
}
</style>
