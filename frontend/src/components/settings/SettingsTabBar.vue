<template>
  <nav v-if="!settingsWindow.isListLayout" class="settings-window__tabs" role="tablist">
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
      {{ t(`settings.tabs.${entry.tab}`) }}
    </button>
  </nav>

  <!-- Always there, also behind the list: do all tabs fit in one row in this language? -->
  <div
    ref="measure"
    class="settings-window__tabs settings-window__tabs--measure"
    aria-hidden="true"
  >
    <span v-for="entry in SETTINGS_TABS" :key="entry.tab" class="settings-window__tab">
      {{ t(`settings.tabs.${entry.tab}`) }}
    </span>
  </div>
</template>

<script setup lang="ts">
import { useResizeObserver } from "@vueuse/core";
import { nextTick, onMounted, useTemplateRef, watch } from "vue";
import { useI18n } from "vue-i18n";

import { SETTINGS_TABS } from "@/constants/settings";
import { useSettingsWindowStore } from "@/stores/settingsWindowStore";

/** A pixel of rounding is no overflow. */
const OVERFLOW_TOLERANCE_PX = 1;

/**
 * The tabs of the wide layout. Tabs never scroll sideways and never wrap: when one does not fit,
 * the window shows the list of sections instead. A hidden copy of the row measures that. Words
 * only: with the icons of the list, seven tabs fit in English alone.
 */
const { t, locale } = useI18n();
const settingsWindow = useSettingsWindowStore();
const measure = useTemplateRef<HTMLElement>("measure");

function measureTabs(): void {
  const row = measure.value;
  if (!row) return;

  const isOverflowing = row.scrollWidth > row.clientWidth + OVERFLOW_TOLERANCE_PX;
  settingsWindow.reportTabsOverflow(isOverflowing);
}

// The row's width follows the window, its words the language; the brand fonts may arrive late
useResizeObserver(measure, measureTabs);
watch(locale, async () => {
  await nextTick();
  measureTabs();
});
onMounted(async () => {
  measureTabs();
  // Test environments have no font loading API
  if (!("fonts" in document)) return;

  await document.fonts.ready;
  measureTabs();
});
</script>

<style scoped>
.settings-window__tabs {
  display: flex;
  gap: 2px;
  padding: 8px 14px 0;
  border-bottom: 1px solid var(--line);
  overflow: hidden;
  white-space: nowrap;
}

/* Same row, out of sight and out of the way; its width is the window's. */
.settings-window__tabs--measure {
  position: absolute;
  top: 0;
  right: 0;
  left: 0;
  visibility: hidden;
  pointer-events: none;
}

.settings-window__tab {
  flex: none;
  padding: 10px 12px 11px;
  border: 0;
  border-bottom: 2px solid transparent;
  background: none;
  color: var(--muted);
  font-weight: 600;
  white-space: nowrap;
  cursor: pointer;
}

.settings-window__tab:hover,
.settings-window__tab--on {
  color: var(--fg);
}

.settings-window__tab--on {
  border-bottom-color: var(--fg);
}
</style>
