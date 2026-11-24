<template>
  <div ref="root" class="settings-menu">
    <button
      class="icon-btn"
      type="button"
      :aria-label="t('settings.open')"
      :title="t('settings.open')"
      :aria-expanded="isOpen"
      @click="isOpen = !isOpen"
    >
      <span class="mdi mdi-cog-outline" />
    </button>

    <div v-if="isOpen" class="settings-menu__panel" role="dialog" :aria-label="t('settings.title')">
      <div class="settings-menu__title">
        {{ t("settings.title") }}
        <span class="settings-menu__version">{{
          t("settings.version", { version: APP_VERSION })
        }}</span>
      </div>

      <div class="settings-menu__row">
        <div>
          <b>{{ t("settings.technicalDetails") }}</b>
          <small>{{ t("settings.technicalDetailsHint") }}</small>
        </div>
        <SwitchToggle
          v-model="settings.isTechnicalDetailsVisible"
          :label="t('settings.technicalDetails')"
        />
      </div>

      <div class="settings-menu__row">
        <label for="settings-locale">
          <b>{{ t("settings.language") }}</b>
        </label>
        <select id="settings-locale" v-model="settings.locale" class="settings-menu__select">
          <option v-for="code in APP_LOCALES" :key="code" :value="code">
            {{ LOCALE_NAMES[code] }}
          </option>
        </select>
      </div>

      <div class="settings-menu__row">
        <div>
          <b>{{ t("settings.paneWidths") }}</b>
          <small>{{ t("settings.paneWidthsHint") }}</small>
        </div>
        <button class="btn" type="button" @click="settings.resetPaneWidths()">
          {{ t("settings.reset") }}
        </button>
      </div>

      <div class="settings-menu__row">
        <div>
          <b>{{ t("settings.cleanup") }}</b>
          <small>{{ t("settings.cleanupHint") }}</small>
        </div>
        <button class="btn" type="button" @click="openCleanup">
          {{ t("settings.cleanupOpen") }}
        </button>
      </div>

      <div class="settings-menu__row">
        <div>
          <b>{{ t("settings.ai") }}</b>
          <small>{{ t("settings.aiHintOff") }}</small>
        </div>
        <button class="btn" type="button" @click="openAi">
          {{ t("settings.aiOpen") }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onClickOutside, onKeyStroke } from "@vueuse/core";
import { ref, useTemplateRef } from "vue";
import { useI18n } from "vue-i18n";

import SwitchToggle from "@/components/common/SwitchToggle.vue";
import { APP_LOCALES, type AppLocale } from "@/i18n";
import { useAiStore } from "@/stores/aiStore";
import { useCleanupStore } from "@/stores/cleanupStore";
import { useSettingsStore } from "@/stores/settingsStore";

/** Language names are shown in their own language, so they are not translated. */
const LOCALE_NAMES: Record<AppLocale, string> = {
  de: "Deutsch",
  en: "English",
  ru: "Русский",
};

/** Set at build time from the app version (vite.config.ts). */
const APP_VERSION = __APP_VERSION__;

const { t } = useI18n();
const settings = useSettingsStore();
const isOpen = ref(false);
const cleanup = useCleanupStore();

const ai = useAiStore();

function openAi(): void {
  isOpen.value = false;
  ai.openSettings();
}

function openCleanup(): void {
  isOpen.value = false;
  cleanup.open();
}
const root = useTemplateRef("root");

onClickOutside(root, () => (isOpen.value = false));
onKeyStroke("Escape", () => (isOpen.value = false));
</script>

<style scoped>
.settings-menu {
  position: relative;
}

.settings-menu__panel {
  position: absolute;
  right: 0;
  top: calc(100% + 6px);
  z-index: 100;
  width: min(330px, calc(100vw - 24px));
  padding: 8px;
  border-radius: 12px;
  border: 1px solid var(--line-strong);
  background: var(--surface);
  box-shadow: var(--shadow);
}

.settings-menu__title {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 8px;
  padding: 6px 8px 8px;
  font-size: 11.5px;
  font-weight: 700;
  letter-spacing: 0.07em;
  text-transform: uppercase;
  color: var(--faint);
}

.settings-menu__version {
  font-family: var(--font-mono);
  font-weight: 500;
  letter-spacing: 0;
  text-transform: none;
  user-select: all;
}

.settings-menu__row {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 8px;
  border-top: 1px solid var(--line);
}

.settings-menu__row > :first-child {
  flex: 1;
  min-width: 0;
}

.settings-menu__row b {
  display: block;
  font-size: 13.5px;
}

.settings-menu__row small {
  display: block;
  margin-top: 2px;
  color: var(--muted);
  font-size: 12px;
  line-height: 1.35;
}

.settings-menu__select {
  height: 32px;
  padding: 0 8px;
  border-radius: 8px;
  border: 1px solid var(--line-strong);
  background: var(--surface-2);
}
</style>
