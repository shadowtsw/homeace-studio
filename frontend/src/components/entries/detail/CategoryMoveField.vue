<template>
  <form class="category-move-field" @submit.prevent="submit">
    <label class="category-move-field__label" :for="inputId">{{ t("detail.category") }}</label>
    <div class="category-move-field__row">
      <input
        :id="inputId"
        v-model="draft"
        class="category-move-field__input"
        :list="listId"
        :placeholder="t('detail.categoryPlaceholder')"
        :disabled="isDisabled"
        autocomplete="off"
      />
      <datalist :id="listId">
        <option v-for="path in allPaths" :key="path" :value="path" />
      </datalist>
      <button class="btn btn--primary" type="submit" :disabled="isDisabled || !canMove">
        {{ t("detail.move") }}
      </button>
    </div>
    <div class="category-move-field__hint">
      <span>{{ t("detail.categoryHint") }}</span>
      <button
        v-if="currentPath"
        class="category-move-field__remove"
        type="button"
        :disabled="isDisabled"
        @click="emit('move', null)"
      >
        {{ t("detail.removeCategory") }}
      </button>
    </div>
  </form>
</template>

<script setup lang="ts">
import { computed, ref, useId, watch } from "vue";
import { useI18n } from "vue-i18n";

const props = defineProps<{
  currentPath: string | null;
  /** Existing folder paths, offered as suggestions. */
  allPaths: string[];
  isDisabled: boolean;
}>();

const emit = defineEmits<{
  /** null takes the entry out of every category. */
  move: [path: string | null];
}>();

const { t } = useI18n();
const inputId = useId();
const listId = useId();
const draft = ref(props.currentPath ?? "");

// Another entry was opened, or the move went through: show its real category again.
watch(
  () => props.currentPath,
  (path) => (draft.value = path ?? ""),
);

const canMove = computed(() => {
  const target = draft.value.trim();

  return target !== "" && target !== props.currentPath;
});

function submit(): void {
  if (!canMove.value) return;

  emit("move", draft.value.trim());
}
</script>

<style scoped>
.category-move-field {
  display: grid;
  gap: 6px;
  padding: 14px 16px;
  border: 1px solid var(--line);
  border-radius: 12px;
  background: var(--surface);
}

.category-move-field__label {
  font-weight: 600;
}

.category-move-field__row {
  display: flex;
  gap: 8px;
}

.category-move-field__input {
  flex: 1;
  min-width: 0;
  height: 36px;
  padding: 0 10px;
  border: 1px solid var(--line-strong);
  border-radius: 8px;
  background: var(--surface-2);
}

.category-move-field__input:focus {
  outline: 0;
  border-color: var(--accent);
  box-shadow: 0 0 0 3px var(--accent-soft);
  background: var(--surface);
}

.category-move-field__hint {
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  gap: 8px;
  color: var(--muted);
  font-size: 12.5px;
}

.category-move-field__remove {
  padding: 0;
  border: 0;
  background: none;
  color: var(--accent);
  cursor: pointer;
  font-size: 12.5px;
  font-weight: 600;
}

.btn:disabled,
.category-move-field__remove:disabled {
  opacity: 0.5;
  cursor: default;
}
</style>
