<template>
  <!-- Sits in the head right at the version it is about (owner 28.11.: in the footer it was not
       clear which side "Merken" meant). -->
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
    <button class="btn btn--sm" type="submit">{{ t("versions.compare.save") }}</button>
    <button class="btn btn--sm" type="button" @click="isNaming = false">
      {{ t("versions.compare.cancel") }}
    </button>
    <button v-if="version.name" class="btn btn--sm" type="button" @click="unpin">
      {{ t("versions.compare.unpin") }}
    </button>
  </form>
  <button
    v-else-if="version.name"
    class="version-name__chip"
    type="button"
    :title="t('versions.compare.renameHint')"
    @click="start"
  >
    <span class="mdi mdi-pin-outline" />„{{ version.name }}“<span class="mdi mdi-pencil-outline" />
  </button>
  <button v-else class="version-name__pin" type="button" @click="start">
    <span class="mdi mdi-pin-outline" />{{ t("versions.compare.pin") }}
  </button>
</template>

<script setup lang="ts">
import { nextTick, ref, useTemplateRef, watch } from "vue";
import { useI18n } from "vue-i18n";

import type { Version } from "@/services/versionsService";

const props = defineProps<{ version: Version }>();
const emit = defineEmits<{
  /** A name to give (plain text, the backend keeps 40 characters). */
  name: [name: string];
  /** Take the name away; the head asks first when that would delete the version. */
  unpin: [];
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
  const name = draft.value.trim();
  // An emptied field means: no name any more
  if (name) emit("name", name);
  else if (props.version.name) emit("unpin");
}

function unpin(): void {
  isNaming.value = false;
  emit("unpin");
}
</script>

<style scoped>
.version-name {
  display: flex;
  flex: 1 1 100%;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px;
}

.version-name__input {
  flex: 1 1 140px;
  min-width: 0;
  height: 30px;
  padding: 0 10px;
  border: 1px solid var(--line-strong);
  border-radius: 8px;
  background: var(--surface);
  color: var(--fg);
}

.version-name__chip,
.version-name__pin {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  max-width: 100%;
  padding: 2px 8px;
  border-radius: 999px;
  font: inherit;
  font-size: 12.5px;
  font-weight: 600;
  white-space: nowrap;
  cursor: pointer;
}

.version-name__chip {
  overflow: hidden;
  border: 1px solid var(--accent);
  background: var(--accent-soft);
  color: var(--accent);
  text-overflow: ellipsis;
}

.version-name__chip .mdi:last-child {
  opacity: 0.7;
}

.version-name__pin {
  border: 1px dashed var(--line-strong);
  background: none;
  color: var(--muted);
}

.version-name__pin:hover {
  border-color: var(--accent);
  color: var(--accent);
}
</style>
