<template>
  <div class="settings-window" role="presentation" @click.self="settingsWindow.close()">
    <section
      ref="panel"
      class="settings-window__panel"
      role="dialog"
      aria-modal="true"
      :aria-label="t('settings.title')"
      tabindex="-1"
    >
      <header class="settings-window__head">
        <h2>{{ t("settings.title") }}</h2>
        <button
          class="icon-btn"
          type="button"
          :aria-label="t('settings.close')"
          :title="t('settings.close')"
          @click="settingsWindow.close()"
        >
          <span class="mdi mdi-close" />
        </button>
      </header>

      <nav class="settings-window__tabs" role="tablist">
        <button
          v-for="entry in SETTINGS_TABS"
          :key="entry.tab"
          class="settings-window__tab"
          :class="{ 'settings-window__tab--on': entry.tab === settingsWindow.tab }"
          type="button"
          role="tab"
          :aria-selected="entry.tab === settingsWindow.tab"
          @click="settingsWindow.selectTab(entry.tab)"
        >
          <span class="mdi" :class="entry.icon" />{{ t(`settings.tabs.${entry.tab}`) }}
        </button>
      </nav>

      <div class="settings-window__body" role="tabpanel">
        <SettingsGeneralTab v-if="settingsWindow.tab === SETTINGS_TAB.general" />
        <SettingsEditingTab v-else-if="settingsWindow.tab === SETTINGS_TAB.editing" />
        <SettingsToolsTab
          v-else-if="settingsWindow.tab === SETTINGS_TAB.tools"
          @cleanup="openCleanup"
          @tidy="openTidy"
        />
        <SettingsAiTab v-else-if="settingsWindow.tab === SETTINGS_TAB.ai" />
        <SettingsAboutTab v-else @whats-new="openWhatsNew" />
      </div>

      <footer class="settings-window__foot">
        <template v-if="settingsWindow.hasHaUser">
          <span><span class="mdi mdi-account-outline" />{{ t("settings.scope.user") }}</span>
          <span><span class="mdi mdi-monitor" />{{ t("settings.scope.device") }}</span>
        </template>
        <span v-else><span class="mdi mdi-monitor" />{{ t("settings.scope.noUser") }}</span>
      </footer>
    </section>
  </div>
</template>

<script setup lang="ts">
import { onKeyStroke } from "@vueuse/core";
import { onMounted, useTemplateRef } from "vue";
import { useI18n } from "vue-i18n";

import { SETTINGS_TAB, SETTINGS_TABS } from "@/constants/settings";
import { useCleanupStore } from "@/stores/cleanupStore";
import { useSettingsWindowStore } from "@/stores/settingsWindowStore";
import { useWhatsNewStore } from "@/stores/whatsNewStore";

import SettingsAboutTab from "./SettingsAboutTab.vue";
import SettingsAiTab from "./SettingsAiTab.vue";
import SettingsEditingTab from "./SettingsEditingTab.vue";
import SettingsGeneralTab from "./SettingsGeneralTab.vue";
import SettingsToolsTab from "./SettingsToolsTab.vue";

/**
 * The window behind the gear: tabs on top, one file per tab. Every setting shows where it applies;
 * the footer explains the symbols. On a phone it fills the screen for now (own layout later).
 */
const emit = defineEmits<{
  /** "Ordnung in einem Klick": its dialog lives with the page's folder actions. */
  tidy: [];
}>();

const { t } = useI18n();
const settingsWindow = useSettingsWindowStore();
const cleanup = useCleanupStore();
const whatsNew = useWhatsNewStore();
const panel = useTemplateRef("panel");

// Tools and "Was ist neu" open windows of their own; this one makes room for them.
function openCleanup(): void {
  settingsWindow.close();
  cleanup.open();
}

function openTidy(): void {
  settingsWindow.close();
  emit("tidy");
}

function openWhatsNew(): void {
  settingsWindow.close();
  whatsNew.open(true);
}

onMounted(() => panel.value?.focus());
onKeyStroke("Escape", () => settingsWindow.close());
</script>

<style scoped>
.settings-window {
  position: fixed;
  inset: 0;
  z-index: 110;
  display: grid;
  place-items: center;
  padding: 20px max(16px, env(safe-area-inset-right, 0px)) 20px
    max(16px, env(safe-area-inset-left, 0px));
  background: var(--scrim);
}

/* A fixed height, so switching tabs does not make the window jump. */
.settings-window__panel {
  display: flex;
  flex-direction: column;
  width: min(880px, 100%);
  height: min(660px, calc(100vh - 40px));
  overflow: hidden;
  border-radius: 16px;
  background: var(--surface);
  box-shadow: var(--shadow);
  outline: 0;
}

.settings-window__head {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 16px 14px 0 22px;
}

.settings-window__head h2 {
  flex: 1;
  margin: 0;
  font: 700 20px/1.2 var(--font-display);
}

.settings-window__tabs {
  display: flex;
  gap: 2px;
  padding: 8px 14px 0;
  border-bottom: 1px solid var(--line);
  overflow-x: auto;
}

.settings-window__tab {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 10px 12px 11px;
  border: 0;
  border-bottom: 2px solid transparent;
  background: none;
  color: var(--muted);
  font-weight: 600;
  white-space: nowrap;
  cursor: pointer;
}

.settings-window__tab .mdi {
  color: var(--faint);
  font-size: 17px;
}

.settings-window__tab:hover,
.settings-window__tab--on,
.settings-window__tab--on .mdi {
  color: var(--fg);
}

.settings-window__tab--on {
  border-bottom-color: var(--fg);
}

.settings-window__body {
  flex: 1;
  min-height: 0;
  overflow: auto;
  padding: 20px 22px 22px;
}

.settings-window__foot {
  display: flex;
  flex-wrap: wrap;
  gap: 4px 18px;
  padding: 10px 22px calc(10px + env(safe-area-inset-bottom, 0px));
  border-top: 1px solid var(--line);
  color: var(--faint);
  font-size: 12px;
}

.settings-window__foot span {
  display: inline-flex;
  align-items: center;
  gap: 5px;
}

/* Shared by the tabs */
.settings-window__body :deep(.settings-card) {
  border: 1px solid var(--line);
  border-radius: 12px;
  background: var(--surface-2);
}

.settings-window__body :deep(.settings-note) {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  margin: 0 2px 14px;
  color: var(--muted);
  font-size: 12.5px;
  line-height: 1.45;
}

/* Links that open GitHub look like the buttons next to them. */
.settings-window__body :deep(a.btn) {
  color: inherit;
  text-decoration: none;
}

.settings-window__body :deep(.settings-select) {
  height: 32px;
  padding: 0 8px;
  border: 1px solid var(--line-strong);
  border-radius: 8px;
  background: var(--surface);
}

@media (max-width: 820px) {
  .settings-window {
    padding: 0;
  }

  .settings-window__panel {
    width: 100%;
    height: 100%;
    border-radius: 0;
    padding-top: env(safe-area-inset-top, 0px);
  }

  .settings-window__body {
    padding: 16px;
  }
}
</style>
