<template>
  <div class="settings-card">
    <SettingsRow
      :title="t('settings.appearance.brightness')"
      :hint="t(brightnessHintKey)"
      :preference="PREFERENCES.colorMode"
    >
      <div
        class="appearance__modes"
        role="radiogroup"
        :aria-label="t('settings.appearance.brightness')"
      >
        <button
          v-for="choice in COLOR_MODE_CHOICES"
          :key="choice"
          class="appearance__mode"
          :class="{ 'appearance__mode--on': choice === themeStore.modeChoice }"
          type="button"
          role="radio"
          :aria-checked="choice === themeStore.modeChoice"
          :disabled="themeStore.isModeLocked"
          @click="themeStore.selectModeChoice(choice)"
        >
          {{ t(`settings.appearance.modes.${choice}`) }}
        </button>
      </div>
    </SettingsRow>

    <SettingsRow
      :title="t('settings.appearance.theme')"
      :hint="t('settings.appearance.themeHint')"
      :preference="PREFERENCES.theme"
    />
    <div class="appearance__themes" role="radiogroup" :aria-label="t('settings.appearance.theme')">
      <button
        v-for="theme in BUILT_IN_THEMES"
        :key="theme.id"
        class="appearance__theme"
        :class="{ 'appearance__theme--on': theme.id === themeStore.theme.id }"
        type="button"
        role="radio"
        :aria-checked="theme.id === themeStore.theme.id"
        @click="themeStore.selectTheme(theme.id)"
      >
        <!-- The theme's own colours, drawn small: page, a surface with text, Wenn/Und nur wenn/Dann, accent -->
        <span class="appearance__preview" :style="previewStyles[theme.id]" aria-hidden="true">
          <span class="appearance__preview-surface">
            <i class="appearance__preview-text" />
            <i class="appearance__preview-text appearance__preview-text--quiet" />
            <span class="appearance__preview-flow">
              <b class="appearance__preview-when" />
              <b class="appearance__preview-if" />
              <b class="appearance__preview-then" />
            </span>
          </span>
          <span class="appearance__preview-accent" />
        </span>
        <b class="appearance__name">{{ t(`settings.appearance.themes.${theme.id}.name`) }}</b>
        <small class="appearance__note">
          {{ t(`settings.appearance.themes.${theme.id}.note`) }}
          <template v-if="!theme.light">· {{ t("settings.appearance.darkOnly") }}</template>
        </small>
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { useI18n } from "vue-i18n";

import { PREFERENCES } from "@/constants/preferences";
import { COLOR_MODE_CHOICES, useThemeStore } from "@/stores/themeStore";
import { BUILT_IN_THEMES } from "@/utils/themes/builtInThemes";
import { COLOR_MODE, type ThemeTokens } from "@/utils/themes/tokens";

import SettingsRow from "./SettingsRow.vue";

/**
 * "Aussehen": brightness on this device, the theme for the user. A theme with one version only
 * (Mitternacht) locks the brightness switch and says why.
 */
const { t } = useI18n();
const themeStore = useThemeStore();

const brightnessHintKey = computed(() => {
  if (!themeStore.isModeLocked) return "settings.appearance.brightnessHint";

  return themeStore.mode === COLOR_MODE.dark
    ? "settings.appearance.onlyDark"
    : "settings.appearance.onlyLight";
});

/** Each card draws its theme in the version it would show now. */
const previewStyles = computed<Record<string, ThemeTokens>>(() => {
  const entries = BUILT_IN_THEMES.map((theme) => [theme.id, themeStore.previewTokens(theme)]);
  return Object.fromEntries(entries);
});
</script>

<style scoped>
.appearance__modes {
  display: flex;
  gap: 2px;
  padding: 3px;
  border-radius: 9px;
  background: var(--sunken);
}

.appearance__mode {
  padding: 5px 11px;
  border: 0;
  border-radius: 7px;
  background: none;
  color: var(--muted);
  font-size: 12.5px;
  font-weight: 600;
  cursor: pointer;
}

.appearance__mode--on {
  background: var(--surface);
  color: var(--fg);
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.08);
}

.appearance__mode:disabled {
  cursor: not-allowed;
  opacity: 0.55;
}

.appearance__themes {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
  gap: 10px;
  padding: 0 16px 16px;
}

.appearance__theme {
  display: grid;
  align-content: start;
  gap: 6px;
  padding: 8px;
  border: 1px solid var(--line);
  border-radius: 12px;
  background: var(--surface);
  color: var(--fg);
  text-align: left;
  cursor: pointer;
}

.appearance__theme:hover {
  border-color: var(--line-strong);
}

.appearance__theme--on,
.appearance__theme--on:hover {
  border-color: var(--accent);
  box-shadow: inset 0 0 0 1px var(--accent);
}

.appearance__name {
  font-size: 13px;
}

.appearance__note {
  color: var(--muted);
  font-size: 11.5px;
  line-height: 1.3;
}

/* The small picture uses the card's own token values (inline), not the page's. */
.appearance__preview {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  align-items: end;
  gap: 6px;
  height: 62px;
  padding: 7px;
  border: 1px solid var(--line);
  border-radius: 8px;
  background: var(--bg);
}

.appearance__preview-surface {
  display: grid;
  gap: 4px;
  padding: 6px;
  border: 1px solid var(--line);
  border-radius: 6px;
  background: var(--surface);
}

.appearance__preview-text {
  display: block;
  width: 80%;
  height: 5px;
  border-radius: 3px;
  background: var(--fg);
}

.appearance__preview-text--quiet {
  width: 50%;
  background: var(--muted);
}

.appearance__preview-flow {
  display: flex;
  gap: 3px;
}

.appearance__preview-flow b {
  width: 12px;
  height: 6px;
  border-radius: 3px;
}

.appearance__preview-when {
  background: var(--flow-when);
}

.appearance__preview-if {
  background: var(--flow-if);
}

.appearance__preview-then {
  background: var(--flow-then);
}

.appearance__preview-accent {
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background: var(--accent);
}
</style>
