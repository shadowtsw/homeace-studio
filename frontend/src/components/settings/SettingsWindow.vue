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
      <header
        class="settings-window__head"
        :class="{ 'settings-window__head--list': settingsWindow.isListLayout }"
      >
        <button
          v-if="backLabel"
          class="settings-window__back"
          type="button"
          :aria-label="t('settings.backTo', { name: backLabel })"
          @click="settingsWindow.back()"
        >
          <span class="mdi mdi-chevron-left" />
          <span class="settings-window__back-name">{{ backLabel }}</span>
        </button>
        <span v-else-if="settingsWindow.isListLayout" />
        <h2>{{ title }}</h2>
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

      <SettingsTabBar />

      <div
        ref="body"
        class="settings-window__body"
        :role="settingsWindow.isListLayout ? undefined : 'tabpanel'"
      >
        <SettingsSectionList v-if="!shownSection" />
        <SettingsGeneralTab v-else-if="shownSection === SETTINGS_TAB.general" />
        <SettingsAppearanceTab v-else-if="shownSection === SETTINGS_TAB.appearance" />
        <SettingsEditingTab v-else-if="shownSection === SETTINGS_TAB.editing" />
        <SettingsToolsTab
          v-else-if="shownSection === SETTINGS_TAB.tools"
          @cleanup="openCleanup"
          @tidy="openTidy"
          @sort-entities="openSorting"
        />
        <SettingsAiTab v-else-if="shownSection === SETTINGS_TAB.ai" />
        <SettingsGoodToKnowTab v-else-if="shownSection === SETTINGS_TAB.goodToKnow" />
        <SettingsAboutTab v-else @whats-new="openWhatsNew" />
      </div>

      <footer class="settings-window__foot">
        <template v-if="settingsWindow.hasHaUser">
          <span>
            <span class="mdi mdi-account-outline" />
            {{ t("settings.scope.userNamed", { name: settingsWindow.detectedHaUser?.name ?? "" }) }}
          </span>
          <span><span class="mdi mdi-monitor" />{{ t("settings.scope.device") }}</span>
        </template>
        <span v-else><span class="mdi mdi-monitor" />{{ t("settings.scope.noUser") }}</span>
      </footer>
    </section>
  </div>
</template>

<script setup lang="ts">
import { onKeyStroke } from "@vueuse/core";
import { computed, onMounted, useTemplateRef, watch } from "vue";
import { useI18n } from "vue-i18n";

import { SETTINGS_TAB } from "@/constants/settings";
import { useCleanupStore } from "@/stores/cleanupStore";
import { useEntitySortingStore } from "@/stores/entitySortingStore";
import { useSettingsWindowStore } from "@/stores/settingsWindowStore";
import { useWhatsNewStore } from "@/stores/whatsNewStore";

import SettingsAboutTab from "./SettingsAboutTab.vue";
import SettingsAiTab from "./SettingsAiTab.vue";
import SettingsAppearanceTab from "./SettingsAppearanceTab.vue";
import SettingsEditingTab from "./SettingsEditingTab.vue";
import SettingsGeneralTab from "./SettingsGeneralTab.vue";
import SettingsGoodToKnowTab from "./SettingsGoodToKnowTab.vue";
import SettingsSectionList from "./SettingsSectionList.vue";
import SettingsTabBar from "./SettingsTabBar.vue";
import SettingsToolsTab from "./SettingsToolsTab.vue";

/**
 * The window behind the gear, in a fixed size. Wide: tabs on top, one file per tab. Phone (and
 * wherever the tabs do not fit in one row): the list of sections, each a page with "‹". Every
 * setting shows where it applies; the footer explains the symbols.
 */
const emit = defineEmits<{
  /** "Ordnung in einem Klick": its dialog lives with the page's folder actions. */
  tidy: [];
}>();

const { t } = useI18n();
const settingsWindow = useSettingsWindowStore();
const cleanup = useCleanupStore();
const sorting = useEntitySortingStore();
const whatsNew = useWhatsNewStore();
const panel = useTemplateRef("panel");
const body = useTemplateRef("body");

/** The section the body shows; null is the list of sections (list layout only). */
const shownSection = computed(() =>
  settingsWindow.isListLayout ? settingsWindow.section : settingsWindow.tab,
);

const title = computed(() => {
  if (!settingsWindow.isListLayout) return t("settings.title");
  if (settingsWindow.topic) return t(`settings.goodToKnow.${settingsWindow.topic}.title`);
  if (settingsWindow.section) return t(`settings.tabs.${settingsWindow.section}`);

  return t("settings.title");
});

/** Where "‹" leads, by name; nothing at the start and in the tab layout. */
const backLabel = computed(() => {
  if (!settingsWindow.isListLayout) return null;
  if (settingsWindow.topic) return t("settings.tabs.goodToKnow");
  if (settingsWindow.section) return t("settings.title");

  return null;
});

// Every page starts at its top
watch(
  () => [settingsWindow.section, settingsWindow.topic],
  () => body.value?.scrollTo({ top: 0 }),
);

// Tools and "Was ist neu" open windows of their own; this one makes room for them.
function openCleanup(): void {
  settingsWindow.close();
  cleanup.open();
}

function openSorting(): void {
  settingsWindow.close();
  sorting.open();
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

/* A fixed size, so switching tabs or pages does not make the window jump. */
.settings-window__panel {
  position: relative;
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

/* List layout: "‹ back" · title in the middle · close, above a line like a phone's page head */
.settings-window__head--list {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto minmax(0, 1fr);
  min-height: 56px;
  padding: 8px 10px;
  border-bottom: 1px solid var(--line);
}

/* A long topic title must leave room for "‹ back" */
.settings-window__head--list h2 {
  max-width: min(46vw, 420px);
  overflow: hidden;
  font-size: 17px;
  text-align: center;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.settings-window__head--list .icon-btn {
  justify-self: end;
}

.settings-window__back {
  display: inline-flex;
  align-items: center;
  justify-self: start;
  max-width: 100%;
  padding: 6px 6px 6px 0;
  border: 0;
  background: none;
  color: var(--accent);
  font-weight: 600;
  cursor: pointer;
}

.settings-window__back .mdi {
  font-size: 22px;
}

.settings-window__back-name {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.settings-window__body {
  flex: 1;
  min-height: 0;
  overflow: auto;
  padding: 20px 22px 22px;
}

.settings-window__head--list ~ .settings-window__body {
  padding-top: 8px;
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

/* Phone: the whole screen */
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
    padding: 8px 16px 16px;
  }
}
</style>
