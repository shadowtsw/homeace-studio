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
      <ThemeCard
        v-for="theme in BUILT_IN_THEMES"
        :key="theme.id"
        :tokens="previewTokens[theme.id] ?? STANDARD_TOKENS.light"
        :name="themeName(theme)"
        :note="themeNote(theme)"
        :is-active="theme.id === themeStore.theme.id"
        @select="themeStore.selectTheme(theme.id)"
      />
    </div>

    <SettingsRow
      :title="t('settings.appearance.ownThemes')"
      :hint="ownThemesHint"
      :preference="PREFERENCES.theme"
    >
      <button
        class="btn btn--sm"
        type="button"
        :disabled="ownThemes.isFull"
        @click="fileInput?.click()"
      >
        <span class="mdi mdi-file-upload-outline" />{{ t("settings.appearance.importFile") }}
      </button>
      <button
        class="btn btn--sm"
        type="button"
        :disabled="ownThemes.isFull"
        @click="themeImport.startPaste()"
      >
        <span class="mdi mdi-clipboard-text-outline" />{{ t("settings.appearance.pasteText") }}
      </button>
      <!-- Only the file's size and text are used, never its name or path -->
      <input
        ref="fileInput"
        class="appearance__file"
        type="file"
        :accept="FILE_TYPES"
        tabindex="-1"
        aria-hidden="true"
        @change="checkChosenFile"
      />
    </SettingsRow>
    <div
      v-if="ownThemes.themes.length"
      class="appearance__themes"
      role="radiogroup"
      :aria-label="t('settings.appearance.ownThemes')"
    >
      <ThemeCard
        v-for="theme in ownThemes.themes"
        :key="theme.id"
        :tokens="previewTokens[theme.id] ?? STANDARD_TOKENS.light"
        :name="themeName(theme)"
        :note="themeNote(theme)"
        :is-active="theme.id === themeStore.theme.id"
        @select="themeStore.selectTheme(theme.id)"
      />
    </div>
    <p v-else class="appearance__empty">{{ t("settings.appearance.noOwnThemes") }}</p>
  </div>

  <div class="appearance__actions">
    <ThemeActions />
  </div>
</template>

<script setup lang="ts">
import { computed, useTemplateRef } from "vue";
import { useI18n } from "vue-i18n";

import { useThemeTexts } from "@/composables/texts/useThemeTexts";
import { PREFERENCES } from "@/constants/preferences";
import { MAX_OWN_THEMES } from "@/core/themes/ownThemes";
import { COLOR_MODE, type ThemeTokens } from "@/core/themes/themeFormat";
import { useOwnThemesStore } from "@/stores/ownThemesStore";
import { useThemeImportStore } from "@/stores/themeImportStore";
import { COLOR_MODE_CHOICES, useThemeStore } from "@/stores/themeStore";
import { BUILT_IN_THEMES, STANDARD_TOKENS } from "@/utils/themes/builtInThemes";

import ThemeActions from "./appearance/ThemeActions.vue";
import ThemeCard from "./appearance/ThemeCard.vue";
import SettingsRow from "./SettingsRow.vue";

/** What the file picker offers; the gate checks the content anyway. */
const FILE_TYPES = ".json,application/json";

/**
 * "Aussehen": brightness on this device, the theme for the user, own themes with import, and what
 * can be done with the chosen theme. A theme with one version only (Mitternacht) locks the
 * brightness switch and says why.
 */
const { t } = useI18n();
const themeStore = useThemeStore();
const ownThemes = useOwnThemesStore();
const themeImport = useThemeImportStore();
const { themeName, themeNote } = useThemeTexts();
const fileInput = useTemplateRef<HTMLInputElement>("fileInput");

const brightnessHintKey = computed(() => {
  if (!themeStore.isModeLocked) return "settings.appearance.brightnessHint";

  return themeStore.mode === COLOR_MODE.dark
    ? "settings.appearance.onlyDark"
    : "settings.appearance.onlyLight";
});

const ownThemesHint = computed(() => {
  if (ownThemes.isFull) return t("settings.appearance.ownThemesFull", { count: MAX_OWN_THEMES });

  return t("settings.appearance.ownThemesHint");
});

/** Each card draws its theme in the version it would show now. */
const previewTokens = computed<Record<string, ThemeTokens>>(() => {
  const shownThemes = [...BUILT_IN_THEMES, ...ownThemes.themes];
  const entries = shownThemes.map((theme) => [theme.id, themeStore.previewTokens(theme)]);
  return Object.fromEntries(entries);
});

/** "Datei importieren": the chosen file goes straight into the gate, on the import page. */
async function checkChosenFile(event: Event): Promise<void> {
  const input = event.target as HTMLInputElement;
  const file = input.files?.[0];
  // The same file can be chosen again after a fix
  input.value = "";
  if (file) await themeImport.checkFile(file);
}
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

.appearance__empty {
  margin: 0;
  padding: 0 16px 16px;
  color: var(--muted);
  font-size: 12.5px;
}

.appearance__file {
  display: none;
}

.appearance__actions {
  margin-top: 12px;
}
</style>
