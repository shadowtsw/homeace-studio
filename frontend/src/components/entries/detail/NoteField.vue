<template>
  <label class="note-field">
    <span class="field-label">{{ t("detail.note") }}</span>
    <textarea
      v-model="draft"
      class="field-input note-field__input"
      rows="3"
      :placeholder="t('detail.notePlaceholder')"
      @blur="emit('save', draft)"
    />
    <span class="note-field__hint">{{ t("detail.noteHint") }}</span>
  </label>
</template>

<script setup lang="ts">
import { ref, watch } from "vue";
import { useI18n } from "vue-i18n";

const props = defineProps<{
  note: string | null;
}>();

/** Fired on blur; the caller skips saving when nothing changed. */
const emit = defineEmits<{
  save: [note: string];
}>();

const { t } = useI18n();
const draft = ref(props.note ?? "");

watch(
  () => props.note,
  (note) => (draft.value = note ?? ""),
);
</script>

<style scoped>
.note-field {
  display: grid;
  gap: 5px;
}

.note-field__input {
  height: auto;
  min-height: 76px;
  padding: 8px 10px;
  resize: vertical;
  line-height: 1.45;
}

.note-field__hint {
  color: var(--faint);
  font-size: 12px;
}
</style>
