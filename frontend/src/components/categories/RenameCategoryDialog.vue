<template>
  <div class="rename-dialog" role="presentation" @click.self="emit('cancel')">
    <form
      class="rename-dialog__panel"
      role="dialog"
      aria-modal="true"
      :aria-label="t('rename.title')"
      @submit.prevent="submit"
    >
      <h2>{{ t("rename.title") }}</h2>
      <p>{{ t("rename.hint") }}</p>

      <label class="rename-dialog__label" :for="inputId">{{ t("rename.name") }}</label>
      <input
        :id="inputId"
        ref="input"
        v-model="name"
        class="rename-dialog__input"
        autocomplete="off"
        :disabled="isBusy"
      />
      <p v-if="problem" class="rename-dialog__problem">{{ problem }}</p>

      <div class="rename-dialog__preview">
        <div class="rename-dialog__preview-title">{{ t("rename.preview") }}</div>
        <p v-if="affectedPaths.length === 0">{{ t("rename.noneInHa") }}</p>
        <div v-for="path in affectedPaths" :key="path" class="rename-dialog__change">
          <code>{{ path }}</code>
          <span class="mdi mdi-arrow-right" />
          <code class="rename-dialog__new">{{ replacePathPrefix(path, folderPath, newPath) }}</code>
        </div>
      </div>

      <div class="rename-dialog__buttons">
        <button class="btn" type="button" :disabled="isBusy" @click="emit('cancel')">
          {{ t("rename.cancel") }}
        </button>
        <button class="btn btn--primary" type="submit" :disabled="isBusy || !canSubmit">
          {{ t("rename.confirm") }}
        </button>
      </div>
    </form>
  </div>
</template>

<script setup lang="ts">
import { onKeyStroke } from "@vueuse/core";
import { computed, onMounted, ref, useId, useTemplateRef } from "vue";
import { useI18n } from "vue-i18n";

import { CATEGORY_SEPARATOR } from "@/constants/entries";
import { isSameOrBelow, lastLevel, renameLastLevel, replacePathPrefix } from "@/utils/categories/categoryPath";

const props = defineProps<{
  /** The folder to rename, e.g. "Haus/Terrasse". */
  folderPath: string;
  /** All folder paths that exist, to preview the changes and warn about duplicates. */
  allPaths: string[];
  isBusy: boolean;
}>();

const emit = defineEmits<{
  cancel: [];
  confirm: [newPath: string];
}>();

const { t } = useI18n();
const inputId = useId();
const input = useTemplateRef("input");
const name = ref(lastLevel(props.folderPath));

const trimmedName = computed(() => name.value.trim());
const newPath = computed(() => renameLastLevel(props.folderPath, trimmedName.value));
const affectedPaths = computed(() =>
  props.allPaths.filter((path) => isSameOrBelow(path, props.folderPath)),
);

const problem = computed(() => {
  if (trimmedName.value.includes(CATEGORY_SEPARATOR)) return t("rename.slashNotAllowed");

  const isTaken = newPath.value !== props.folderPath && props.allPaths.includes(newPath.value);

  return isTaken ? t("rename.exists") : "";
});

const canSubmit = computed(
  () => trimmedName.value !== "" && !problem.value && newPath.value !== props.folderPath,
);

function submit(): void {
  if (!canSubmit.value) return;

  emit("confirm", newPath.value);
}

onKeyStroke("Escape", () => emit("cancel"));

onMounted(() => {
  input.value?.focus();
  input.value?.select();
});
</script>

<style scoped>
.rename-dialog {
  position: fixed;
  inset: 0;
  z-index: 110;
  display: grid;
  place-items: center;
  padding: 20px max(16px, env(safe-area-inset-right, 0px)) 20px
    max(16px, env(safe-area-inset-left, 0px));
  background: var(--scrim);
}

.rename-dialog__panel {
  display: grid;
  gap: 12px;
  width: min(480px, 100%);
  max-height: 90vh;
  overflow: auto;
  padding: 22px;
  border-radius: 16px;
  background: var(--surface);
  box-shadow: var(--shadow);
}

.rename-dialog__panel h2 {
  margin: 0;
  font: 700 20px/1.2 var(--font-display);
}

.rename-dialog__panel p {
  margin: 0;
  color: var(--muted);
}

.rename-dialog__label {
  font-weight: 600;
}

.rename-dialog__input {
  height: 38px;
  padding: 0 10px;
  border: 1px solid var(--line-strong);
  border-radius: 8px;
  background: var(--surface-2);
}

.rename-dialog__input:focus {
  outline: 0;
  border-color: var(--accent);
  box-shadow: 0 0 0 3px var(--accent-soft);
}

.rename-dialog__panel .rename-dialog__problem {
  color: var(--err);
  font-size: 12.5px;
}

.rename-dialog__preview {
  display: grid;
  gap: 6px;
  padding: 10px 12px;
  border: 1px solid var(--line);
  border-radius: 10px;
  background: var(--surface-2);
  font-size: 13px;
}

.rename-dialog__preview-title {
  color: var(--faint);
  font-size: 11.5px;
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
}

.rename-dialog__change {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px;
}

.rename-dialog__change code {
  padding: 1px 6px;
  border: 1px solid var(--line);
  border-radius: 5px;
  background: var(--surface);
}

.rename-dialog__change .mdi {
  color: var(--faint);
}

.rename-dialog__change .rename-dialog__new {
  border-color: var(--accent);
  color: var(--accent);
}

.rename-dialog__buttons {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}

.btn:disabled {
  opacity: 0.5;
  cursor: default;
}
</style>
