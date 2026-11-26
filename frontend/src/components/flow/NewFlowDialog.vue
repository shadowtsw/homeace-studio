<template>
  <DialogFrame :title="t(`newFlow.title.${kind}`)" @close="emit('cancel')" @submit="submit">
    <p class="new-flow__hint">{{ t(`newFlow.hint.${kind}`) }}</p>

    <label class="field-label" :for="nameId">{{ t("newFlow.name") }}</label>
    <input
      :id="nameId"
      ref="nameInput"
      v-model="name"
      class="field-input"
      autocomplete="off"
      :disabled="isBusy"
    />

    <label class="field-label" :for="folderId">{{ t("newFlow.folder") }}</label>
    <input
      :id="folderId"
      v-model="folder"
      class="field-input"
      :list="foldersListId"
      :placeholder="t('detail.categoryPlaceholder')"
      autocomplete="off"
    />
    <datalist :id="foldersListId">
      <option v-for="path in allPaths" :key="path" :value="path" />
    </datalist>

    <template #buttons>
      <button class="btn" type="button" :disabled="isBusy" @click="emit('cancel')">
        {{ t("common.cancel") }}
      </button>
      <button class="btn btn--primary" type="submit" :disabled="isBusy || !name.trim()">
        {{ t("common.create") }}
      </button>
    </template>
  </DialogFrame>
</template>

<script setup lang="ts">
import { onMounted, ref, useId, useTemplateRef } from "vue";
import { useI18n } from "vue-i18n";

import DialogFrame from "@/components/common/DialogFrame.vue";
import type { NamedKind, NewFlow } from "@/services/flowsService";

/** Name and folder of a new, empty automation, script or scene; it is filled in afterwards. */
const props = defineProps<{
  kind: NamedKind;
  /** Folder to suggest, usually the one selected in the tree. */
  initialFolder: string | null;
  /** Existing folder paths, offered as suggestions. */
  allPaths: string[];
  isBusy: boolean;
}>();

const emit = defineEmits<{
  cancel: [];
  confirm: [flow: NewFlow];
}>();

const { t } = useI18n();
const nameId = useId();
const folderId = useId();
const foldersListId = useId();
const nameInput = useTemplateRef("nameInput");

const name = ref("");
const folder = ref(props.initialFolder ?? "");

function submit(): void {
  const trimmedName = name.value.trim();

  if (!trimmedName) return;

  emit("confirm", {
    kind: props.kind,
    name: trimmedName,
    categoryPath: folder.value.trim() || null,
  });
}

onMounted(() => nameInput.value?.focus());
</script>

<style scoped>
.new-flow__hint {
  margin: 0;
  color: var(--muted);
  font-size: 13px;
}
</style>
