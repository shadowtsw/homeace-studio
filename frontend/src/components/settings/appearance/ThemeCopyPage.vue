<template>
  <div class="theme-copy">
    <p class="settings-note">
      <span class="mdi mdi-information-outline" />{{ t("settings.appearance.copyByHand") }}
    </p>
    <textarea
      ref="field"
      class="theme-copy__text"
      :value="themeImport.copyFileText"
      :aria-label="t('settings.appearance.copyLabel')"
      readonly
      spellcheck="false"
      @focus="selectAll"
    />
    <div class="theme-copy__actions">
      <button class="btn btn--primary" type="button" @click="settingsWindow.back()">
        {{ t("settings.appearance.done") }}
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, useTemplateRef } from "vue";
import { useI18n } from "vue-i18n";

import { useSettingsWindowStore } from "@/stores/settingsWindowStore";
import { useThemeImportStore } from "@/stores/themeImportStore";

/**
 * Where the clipboard is closed (HA over plain http, some apps): the theme's text, selected, to copy
 * by hand. A page below "Aussehen".
 */
const { t } = useI18n();
const settingsWindow = useSettingsWindowStore();
const themeImport = useThemeImportStore();
const field = useTemplateRef<HTMLTextAreaElement>("field");

function selectAll(): void {
  field.value?.select();
}

onMounted(() => field.value?.focus());
</script>

<style scoped>
.theme-copy {
  display: grid;
  gap: 12px;
}

.theme-copy__text {
  width: 100%;
  min-height: 260px;
  padding: 10px 12px;
  border: 1px solid var(--line-strong);
  border-radius: 10px;
  background: var(--surface-2);
  color: var(--fg);
  font: 12.5px/1.5 var(--font-mono);
  resize: vertical;
}

.theme-copy__actions {
  display: flex;
  justify-content: flex-end;
}
</style>
