<template>
  <div ref="root" class="language-menu">
    <button
      class="language-menu__button"
      type="button"
      :aria-label="t('settings.languageMenu')"
      :title="t('settings.languageMenu')"
      :aria-expanded="isOpen"
      @click="isOpen = !isOpen"
    >
      {{ settings.locale.toUpperCase() }}<span class="mdi mdi-chevron-down" />
    </button>

    <div v-if="isOpen" class="language-menu__panel" role="menu">
      <button
        v-for="code in APP_LOCALES"
        :key="code"
        class="language-menu__item"
        type="button"
        role="menuitemradio"
        :aria-checked="code === settings.locale"
        @click="pick(code)"
      >
        {{ LOCALE_NAMES[code] }}
        <span v-if="code === settings.locale" class="mdi mdi-check" />
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onClickOutside, onKeyStroke } from "@vueuse/core";
import { ref, useTemplateRef } from "vue";
import { useI18n } from "vue-i18n";

import { APP_LOCALES, LOCALE_NAMES, type AppLocale } from "@/i18n";
import { useSettingsStore } from "@/stores/settingsStore";

/** The only quick setting: the language, next to the gear. It also sits in the settings window. */
const { t } = useI18n();
const settings = useSettingsStore();
const isOpen = ref(false);
const root = useTemplateRef("root");

function pick(code: AppLocale): void {
  settings.locale = code;
  isOpen.value = false;
}

onClickOutside(root, () => (isOpen.value = false));
onKeyStroke("Escape", () => (isOpen.value = false));
</script>

<style scoped>
.language-menu {
  position: relative;
}

.language-menu__button {
  display: inline-flex;
  align-items: center;
  gap: 1px;
  height: 34px;
  padding: 0 5px 0 9px;
  border: 0;
  border-radius: 8px;
  background: transparent;
  color: var(--muted);
  font-size: 12.5px;
  font-weight: 700;
  letter-spacing: 0.05em;
  cursor: pointer;
}

.language-menu__button:hover {
  background: var(--sunken);
  color: var(--fg);
}

.language-menu__panel {
  position: absolute;
  right: 0;
  top: calc(100% + 6px);
  z-index: 100;
  display: grid;
  min-width: 160px;
  padding: 6px;
  border: 1px solid var(--line-strong);
  border-radius: 12px;
  background: var(--surface);
  box-shadow: var(--shadow);
}

.language-menu__item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 8px 10px;
  border: 0;
  border-radius: 8px;
  background: none;
  color: var(--fg);
  text-align: left;
  cursor: pointer;
}

.language-menu__item:hover {
  background: var(--sunken);
}

.language-menu__item .mdi {
  color: var(--accent);
}
</style>
