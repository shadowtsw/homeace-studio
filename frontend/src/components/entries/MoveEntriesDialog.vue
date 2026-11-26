<template>
  <DialogFrame
    :title="title ?? t('move.title', { count }, count)"
    @close="emit('cancel')"
    @submit="submit"
  >
    <label class="field-label" :for="folderId">{{ t("move.folder") }}</label>
    <input
      :id="folderId"
      ref="folderInput"
      v-model="folder"
      class="field-input"
      :list="pathsId"
      :placeholder="t('detail.categoryPlaceholder')"
      autocomplete="off"
      :disabled="isBusy"
    />
    <datalist :id="pathsId">
      <option v-for="path in allPaths" :key="path" :value="path" />
    </datalist>
    <p class="move__hint">{{ t("move.hint") }}</p>

    <template #buttons>
      <button class="btn" type="button" :disabled="isBusy" @click="emit('cancel')">
        {{ t("common.cancel") }}
      </button>
      <button class="btn btn--primary" type="submit" :disabled="isBusy || !target">
        {{ isBusy ? t("move.running") : t("move.confirm") }}
      </button>
    </template>
  </DialogFrame>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, useId, useTemplateRef } from "vue";
import { useI18n } from "vue-i18n";

import DialogFrame from "@/components/common/DialogFrame.vue";
import { normalizeFolderPath } from "@/utils/categories/cleanupSelection";

/** Target folder for ticked entries or one entity; a new folder is created on the way. */
defineProps<{
  count: number;
  allPaths: string[];
  isBusy: boolean;
  /** Instead of "N Einträge verschieben", e.g. for one entity. */
  title?: string;
}>();

const emit = defineEmits<{
  cancel: [];
  confirm: [path: string];
}>();

const { t } = useI18n();
const folderId = useId();
const pathsId = useId();
const folderInput = useTemplateRef("folderInput");
const folder = ref("");
const target = computed(() => normalizeFolderPath(folder.value));

function submit(): void {
  if (target.value) emit("confirm", target.value);
}

onMounted(() => folderInput.value?.focus());
</script>

<style scoped>
.move__hint {
  margin: 0;
  color: var(--muted);
  font-size: 12.5px;
}
</style>
