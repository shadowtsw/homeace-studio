<template>
  <DialogFrame
    :title="parent ? t('folder.titleSub', { name: lastLevel(parent) }) : t('folder.title')"
    @close="emit('cancel')"
    @submit="submit"
  >
    <p class="new-folder__hint">{{ t("folder.hint") }}</p>

    <label class="field-label" :for="inputId">{{ t("folder.name") }}</label>
    <input
      :id="inputId"
      ref="input"
      v-model="name"
      class="field-input"
      autocomplete="off"
      :disabled="isBusy"
    />
    <p v-if="problem" class="field-problem">{{ problem }}</p>

    <div v-if="isTechnicalDetailsVisible" class="new-folder__preview">
      <span>{{ t("folder.inHa") }}</span>
      <code>{{ path || "…" }}</code>
    </div>

    <template #buttons>
      <button class="btn" type="button" :disabled="isBusy" @click="emit('cancel')">
        {{ t("common.cancel") }}
      </button>
      <button class="btn btn--primary" type="submit" :disabled="isBusy || !canSubmit">
        {{ t("common.create") }}
      </button>
    </template>
  </DialogFrame>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, useId, useTemplateRef } from "vue";
import { useI18n } from "vue-i18n";

import DialogFrame from "@/components/common/DialogFrame.vue";
import { CATEGORY_SEPARATOR } from "@/constants/entries";
import { lastLevel } from "@/utils/categoryPath";

const props = defineProps<{
  /** Folder to create the new one in; null for a top-level folder. */
  parent: string | null;
  /** All folder paths that exist, to warn about duplicates. */
  allPaths: string[];
  isBusy: boolean;
  /** The name HA gets is a technical detail; shown only with "Technische Details". */
  isTechnicalDetailsVisible: boolean;
}>();

const emit = defineEmits<{
  cancel: [];
  confirm: [path: string];
}>();

const { t } = useI18n();
const inputId = useId();
const input = useTemplateRef("input");
const name = ref("");

const trimmedName = computed(() => name.value.trim());
const path = computed(() => {
  if (!trimmedName.value) return "";

  return props.parent ? props.parent + CATEGORY_SEPARATOR + trimmedName.value : trimmedName.value;
});

const problem = computed(() => {
  if (trimmedName.value.includes(CATEGORY_SEPARATOR)) return t("rename.slashNotAllowed");

  return props.allPaths.includes(path.value) ? t("rename.exists") : "";
});

const canSubmit = computed(() => trimmedName.value !== "" && !problem.value);

function submit(): void {
  if (!canSubmit.value) return;

  emit("confirm", path.value);
}

onMounted(() => input.value?.focus());
</script>

<style scoped>
.new-folder__hint {
  margin: 0;
  color: var(--muted);
}

.new-folder__preview {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
  padding: 10px 12px;
  border: 1px solid var(--line);
  border-radius: 10px;
  background: var(--surface-2);
  color: var(--muted);
  font-size: 13px;
}

.new-folder__preview code {
  padding: 1px 6px;
  border: 1px solid var(--accent);
  border-radius: 5px;
  background: var(--surface);
  color: var(--accent);
}
</style>
