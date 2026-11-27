<template>
  <nav class="settings-sections" :aria-label="t('settings.title')">
    <button
      v-for="entry in SETTINGS_TABS"
      :key="entry.tab"
      class="settings-sections__row"
      type="button"
      @click="settingsWindow.open(entry.tab)"
    >
      <span class="mdi settings-sections__icon" :class="entry.icon" />
      <span class="settings-sections__text">
        <b>{{ t(`settings.tabs.${entry.tab}`) }}</b>
        <small v-if="summaries[entry.tab]">{{ summaries[entry.tab] }}</small>
      </span>
      <span
        v-if="badges[entry.tab]"
        class="settings-sections__badge"
        :class="`settings-sections__badge--${badges[entry.tab]?.tone}`"
      >
        {{ badges[entry.tab]?.text }}
      </span>
      <span class="mdi mdi-chevron-right settings-sections__chevron" />
    </button>
  </nav>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { useI18n } from "vue-i18n";

import { GOOD_TO_KNOW_TOPICS, SETTINGS_TABS, type SettingsTab } from "@/constants/settings";
import { LOCALE_NAMES } from "@/i18n";
import { useAiStore } from "@/stores/aiStore";
import { useSettingsStore } from "@/stores/settingsStore";
import { useSettingsWindowStore } from "@/stores/settingsWindowStore";
import { useThemeStore } from "@/stores/themeStore";
import { useWhatsNewStore } from "@/stores/whatsNewStore";

const SUMMARY_SEPARATOR = " · ";
const TOOLS_SEPARATOR = ", ";

type SectionBadge = { text: string; tone: "on" | "off" | "new" };

/**
 * The start of the window in the list layout: every section with its current values below the
 * name, and a badge only where it matters (AI access on or off, highlights not seen yet).
 */
const { t } = useI18n();
const settingsWindow = useSettingsWindowStore();
const settings = useSettingsStore();
const ai = useAiStore();
const whatsNew = useWhatsNewStore();
const themeStore = useThemeStore();

const generalSummary = computed(() => {
  const technicalKey = settings.isTechnicalDetailsVisible
    ? "settings.summary.technicalDetailsOn"
    : "settings.summary.technicalDetailsOff";
  const labelsKey = settings.isListLabelsVisible
    ? "settings.summary.listLabelsOn"
    : "settings.summary.listLabelsOff";

  return [LOCALE_NAMES[settings.locale], t(technicalKey), t(labelsKey)].join(SUMMARY_SEPARATOR);
});

/** Brightness, then the theme: "System · Standard". */
const appearanceSummary = computed(() => {
  const brightness = t(`settings.appearance.modes.${themeStore.modeChoice}`);
  const themeName = t(`settings.appearance.themes.${themeStore.theme.id}.name`);

  return [brightness, themeName].join(SUMMARY_SEPARATOR);
});

const editingSummary = computed(() => {
  const scenesKey = settings.isSceneAutoSave
    ? "settings.summary.scenesAuto"
    : "settings.summary.scenesManual";
  const traces = t("settings.summary.storedTraces", settings.storedTraces);

  return [t(scenesKey), traces].join(SUMMARY_SEPARATOR);
});

/** The tools by name, so the line says what is inside. */
const toolsSummary = computed(() =>
  [t("settings.cleanup"), t("areas.tidy.title"), t("settings.sortEntities")].join(TOOLS_SEPARATOR),
);

const aboutSummary = computed(() => {
  const version = t("settings.version", { version: __APP_VERSION__ });
  if (!whatsNew.hasHighlights) return version;

  return [version, t("settings.whatsNewOpen")].join(SUMMARY_SEPARATOR);
});

const summaries = computed<Record<SettingsTab, string>>(() => ({
  general: generalSummary.value,
  appearance: appearanceSummary.value,
  editing: editingSummary.value,
  tools: toolsSummary.value,
  ai: "",
  goodToKnow: t("settings.summary.topics", GOOD_TO_KNOW_TOPICS.length),
  about: aboutSummary.value,
}));

const aiBadge = computed<SectionBadge | null>(() => {
  if (!ai.mcp) return null;
  if (ai.mcp.isEnabled) return { text: t("settings.summary.on"), tone: "on" };

  return { text: t("settings.summary.off"), tone: "off" };
});

const aboutBadge = computed<SectionBadge | null>(() => {
  if (whatsNew.unseenCount === 0) return null;

  return { text: t("settings.summary.newCount", whatsNew.unseenCount), tone: "new" };
});

const badges = computed<Partial<Record<SettingsTab, SectionBadge>>>(() => {
  const shown: Partial<Record<SettingsTab, SectionBadge>> = {};
  if (aiBadge.value) shown.ai = aiBadge.value;
  if (aboutBadge.value) shown.about = aboutBadge.value;

  return shown;
});

// The AI badge needs the add-on's AI access; the AI page loads the same
if (!ai.mcp) {
  void ai.loadMcp().catch((error: unknown) => console.error("Loading MCP access failed", error));
}
</script>

<style scoped>
.settings-sections {
  display: grid;
}

.settings-sections__row {
  display: flex;
  align-items: center;
  gap: 12px;
  width: 100%;
  min-height: 56px;
  padding: 10px 4px;
  border: 0;
  border-bottom: 1px solid var(--line);
  background: none;
  color: var(--fg);
  text-align: left;
  cursor: pointer;
}

.settings-sections__row:hover {
  background: var(--surface-2);
}

.settings-sections__icon {
  color: var(--muted);
  font-size: 20px;
}

.settings-sections__text {
  display: grid;
  flex: 1;
  gap: 2px;
  min-width: 0;
}

.settings-sections__text b {
  font-weight: 600;
}

.settings-sections__text small {
  overflow: hidden;
  color: var(--muted);
  font-size: 12.5px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.settings-sections__badge {
  padding: 2px 8px;
  border-radius: 999px;
  background: var(--sunken);
  color: var(--muted);
  font-size: 11.5px;
  font-weight: 700;
  white-space: nowrap;
}

.settings-sections__badge--on {
  background: var(--ok-soft);
  color: var(--ok);
}

.settings-sections__badge--new {
  background: var(--accent-soft);
  color: var(--accent);
}

.settings-sections__chevron {
  color: var(--faint);
  font-size: 20px;
}
</style>
