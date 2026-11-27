<template>
  <div class="theme-import">
    <div class="theme-import__content">
      <!-- Pasted text: nothing is taken over before the check -->
      <template v-if="themeImport.stage === IMPORT_STAGE.paste">
        <p class="settings-note">
          <span class="mdi mdi-shield-check-outline" />{{ t("settings.appearance.pasteHint") }}
        </p>
        <textarea
          v-model="themeImport.text"
          class="theme-import__text"
          :aria-label="t('settings.appearance.pasteLabel')"
          :placeholder="PASTE_PLACEHOLDER"
          spellcheck="false"
        />
      </template>

      <p v-else-if="themeImport.stage === IMPORT_STAGE.checking" class="settings-note">
        <span class="mdi mdi-timer-sand" />{{ t("settings.appearance.checking") }}
      </p>

      <!-- The result: why not, or a preview with the report -->
      <template v-else-if="result && !result.isValid">
        <p class="theme-import__error">
          <span class="mdi mdi-alert-circle-outline" />
          <span>
            <b>{{ importErrorText(result.error) }}</b> {{ t("settings.appearance.nothingTaken") }}
          </span>
        </p>
        <ThemeReport v-if="themeImport.report.length" :lines="themeImport.report" />
      </template>

      <template v-else-if="preview">
        <h3 class="theme-import__title">
          {{ t("settings.appearance.takeTitle", { name: preview.name }) }}
        </h3>
        <div class="theme-import__previews">
          <ThemeCard
            v-for="version in preview.versions"
            :key="version.mode"
            :tokens="version.tokens"
            :name="preview.name"
            :note="t(`settings.appearance.words.mode.${version.mode}`)"
            :is-active="false"
            is-picture
          />
        </div>
        <ThemeReport :lines="themeImport.report" />
      </template>

      <p v-if="themeImport.stage === IMPORT_STAGE.result" class="theme-import__gate">
        <span class="mdi mdi-shield-outline" />{{ t("settings.appearance.gateNote") }}
      </p>
    </div>

    <!-- Stays at the bottom while the content scrolls -->
    <div class="theme-import__actions">
      <button class="btn" type="button" @click="settingsWindow.back()">
        {{ t("common.cancel") }}
      </button>
      <button v-if="canEditText" class="btn" type="button" @click="themeImport.editText()">
        {{ t("settings.appearance.backToText") }}
      </button>
      <button
        v-if="themeImport.stage === IMPORT_STAGE.paste"
        class="btn btn--primary"
        type="button"
        :disabled="!themeImport.text.trim()"
        @click="themeImport.checkText()"
      >
        <span class="mdi mdi-shield-check-outline" />{{ t("settings.appearance.check") }}
      </button>
      <button
        v-if="preview"
        class="btn btn--primary"
        type="button"
        :disabled="themeImport.isTaking"
        @click="take"
      >
        <span class="mdi mdi-check" />{{ t("settings.appearance.take") }}
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { useI18n } from "vue-i18n";

import { useThemeTexts } from "@/composables/texts/useThemeTexts";
import { COLOR_MODES } from "@/core/themes/themeFormat";
import { useMessagesStore } from "@/stores/messagesStore";
import { useSettingsWindowStore } from "@/stores/settingsWindowStore";
import { IMPORT_STAGE, useThemeImportStore } from "@/stores/themeImportStore";
import { useToastStore } from "@/stores/toastStore";
import { ownThemeDefinition, themeTokens } from "@/utils/themes/builtInThemes";

import ThemeCard from "./ThemeCard.vue";
import ThemeReport from "./ThemeReport.vue";

const PASTE_PLACEHOLDER = '{ "homeace-theme": 1, … }';
/** The preview's theme is no stored one yet. */
const PREVIEW_ID = "preview";

/**
 * "Theme importieren", a page below "Aussehen": paste text or take the chosen file, let the gate
 * check it, look at the preview and the report, and only then take it over.
 */
const { t } = useI18n();
const settingsWindow = useSettingsWindowStore();
const themeImport = useThemeImportStore();
const messages = useMessagesStore();
const toasts = useToastStore();
const { importErrorText } = useThemeTexts();

const result = computed(() => themeImport.result);
/** A pasted text that did not pass can be fixed; a file cannot. */
const canEditText = computed(() =>
  Boolean(result.value && !result.value.isValid && themeImport.text),
);

/** The checked theme drawn in each version it has, with the name it will get. */
const preview = computed(() => {
  const current = result.value;
  if (!current?.isValid) return null;

  const name = current.theme.name || t("settings.appearance.importedName");
  const definition = ownThemeDefinition({ id: PREVIEW_ID, theme: current.theme });
  const modes = COLOR_MODES.filter((mode) => definition[mode]);
  const versions = modes.map((mode) => ({
    mode,
    tokens: themeTokens({ theme: definition, mode }).tokens,
  }));

  return { name, versions };
});

async function take(): Promise<void> {
  try {
    const added = await themeImport.take(t("settings.appearance.importedName"));
    if (added) toasts.show({ text: t("settings.appearance.taken", { name: added.name }) });
  } catch (error) {
    toasts.show({
      text: messages.textFor({ error, fallback: t("errors.actionFailed") }),
      tone: "error",
    });
  }
}
</script>

<style scoped>
/* The content scrolls with the window; the actions stay at the bottom. */
.theme-import {
  display: flex;
  flex-direction: column;
  min-height: 100%;
}

.theme-import__content {
  display: grid;
  flex: 1;
  align-content: start;
  gap: 12px;
}

.theme-import__text {
  width: 100%;
  min-height: 220px;
  padding: 10px 12px;
  border: 1px solid var(--line-strong);
  border-radius: 10px;
  background: var(--surface);
  color: var(--fg);
  font: 12.5px/1.5 var(--font-mono);
  resize: vertical;
}

.theme-import__error {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  margin: 0;
  padding: 10px 12px;
  border-radius: 10px;
  background: var(--err-soft);
  color: var(--fg);
}

.theme-import__error .mdi {
  color: var(--err);
  font-size: 18px;
}

.theme-import__title {
  margin: 0;
  font: 700 17px/1.25 var(--font-display);
}

.theme-import__previews {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(140px, 180px));
  gap: 10px;
}

.theme-import__gate {
  display: flex;
  align-items: center;
  gap: 6px;
  margin: 0;
  color: var(--muted);
  font-size: 12px;
}

.theme-import__actions {
  position: sticky;
  bottom: -22px;
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: 8px;
  margin: 16px -22px -22px;
  padding: 12px 22px;
  border-top: 1px solid var(--line);
  background: var(--surface);
}

@media (max-width: 820px) {
  .theme-import__actions {
    bottom: -16px;
    margin: 16px -16px -16px;
    padding: 12px 16px;
  }
}
</style>
