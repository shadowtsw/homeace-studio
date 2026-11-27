<template>
  <form v-if="isNaming" class="version-name" @submit.prevent="save">
    <input
      ref="input"
      v-model="draft"
      class="version-name__input"
      maxlength="40"
      :placeholder="t('versions.compare.namePlaceholder')"
      :aria-label="t('versions.compare.nameLabel')"
      @keydown.esc.stop="isNaming = false"
    />
    <button class="btn" type="submit">{{ t("versions.compare.save") }}</button>
    <button class="btn" type="button" @click="isNaming = false">
      {{ t("versions.compare.cancel") }}
    </button>
  </form>
  <template v-else-if="version.name">
    <button class="btn" type="button" @click="start">
      <span class="mdi mdi-pencil-outline" />{{ t("versions.compare.rename") }}
    </button>
    <button class="btn" type="button" @click="emit('name', null)">
      {{ t("versions.compare.unpin") }}
    </button>
  </template>
  <button v-else class="btn" type="button" @click="start">
    <span class="mdi mdi-pin-outline" />{{ t("versions.compare.pin") }}
  </button>
</template>

<script setup lang="ts">
import { nextTick, ref, useTemplateRef, watch } from "vue";
import { useI18n } from "vue-i18n";

import type { Version } from "@/services/versionsService";

const props = defineProps<{ version: Version }>();
const emit = defineEmits<{
  /** A name to give (plain text, the backend keeps 40 characters), or null to take it away. */
  name: [name: string | null];
}>();

const { t } = useI18n();
const isNaming = ref(false);
const draft = ref("");
const input = useTemplateRef<HTMLInputElement>("input");

watch(
  () => props.version.id,
  () => (isNaming.value = false),
);

async function start(): Promise<void> {
  draft.value = props.version.name ?? "";
  isNaming.value = true;
  await nextTick();
  input.value?.select();
}

function save(): void {
  isNaming.value = false;
  emit("name", draft.value.trim() || null);
}
</script>

<style scoped>
.version-name {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px;
}

.version-name__input {
  width: 220px;
  height: 32px;
  padding: 0 10px;
  border: 1px solid var(--line-strong);
  border-radius: 8px;
  background: var(--surface-2);
  color: var(--fg);
}
</style>
