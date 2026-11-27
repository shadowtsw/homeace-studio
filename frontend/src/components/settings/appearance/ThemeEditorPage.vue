<template>
  <div v-if="draft" class="theme-editor">
    <div class="theme-editor__content">
      <div class="theme-editor__head">
        <input
          class="theme-editor__name"
          :value="draft.name"
          :maxlength="MAX_THEME_NAME_LENGTH"
          :aria-label="t('settings.appearance.editor.name')"
          :placeholder="t('settings.appearance.editor.defaultName')"
          @input="editor.setName(($event.target as HTMLInputElement).value)"
        />
        <!-- A new theme can still take another start; an own one is what it is -->
        <select
          v-if="!draft.ownId"
          class="settings-select"
          :value="draft.startId"
          :aria-label="t('settings.appearance.editor.startLabel')"
          @change="changeStart"
        >
          <option v-for="theme in BUILT_IN_THEMES" :key="theme.id" :value="theme.id">
            {{ startLabel(theme) }}
          </option>
        </select>
        <div
          v-if="draft.light"
          class="theme-editor__modes"
          role="radiogroup"
          :aria-label="t('settings.appearance.brightness')"
        >
          <button
            v-for="mode in COLOR_MODES"
            :key="mode"
            class="theme-editor__mode"
            :class="{ 'theme-editor__mode--on': mode === editor.shownMode }"
            type="button"
            role="radio"
            :aria-checked="mode === editor.shownMode"
            @click="editor.setEditMode(mode)"
          >
            {{ t(`settings.appearance.editor.edit.${mode}`) }}
          </button>
        </div>
        <small v-else class="theme-editor__dark-only">{{
          t("settings.appearance.darkOnly")
        }}</small>
      </div>

      <div class="theme-editor__columns">
        <ThemeEditorFields />

        <div class="theme-editor__preview">
          <ThemePhonePreview v-if="isPhoneInside" :tokens="editor.previewTokens" />
          <ThemePreview v-else :tokens="editor.previewTokens" />
        </div>
      </div>

      <ThemeContrastChecks
        :checks="editor.checks"
        :is-derived="editor.isEditedDerived"
        @suggest="editor.applySuggestion"
      />
    </div>

    <!-- Stays at the bottom while the content scrolls -->
    <div class="theme-editor__actions">
      <button
        v-if="!settingsWindow.isListLayout"
        class="btn btn--sm"
        type="button"
        :aria-pressed="editor.isPhonePreviewShown"
        @click="editor.isPhonePreviewShown = !editor.isPhonePreviewShown"
      >
        <span class="mdi mdi-cellphone" />{{ phoneToggleText }}
      </button>
      <span class="theme-editor__space" />
      <button class="btn" type="button" @click="cancel">{{ t("common.cancel") }}</button>
      <button class="btn btn--primary" type="button" :disabled="editor.isSaving" @click="save">
        <span class="mdi mdi-content-save-outline" />{{ t("settings.appearance.editor.save") }}
      </button>
    </div>

    <ConfirmDialog
      v-if="isConfirmingDiscard"
      :title="t('settings.appearance.editor.discardTitle')"
      :text="t('settings.appearance.editor.discardText')"
      :confirm-label="t('settings.appearance.editor.discard')"
      :is-busy="false"
      @cancel="isConfirmingDiscard = false"
      @confirm="discardAndLeave"
    />
  </div>
</template>

<script setup lang="ts">
import { useMediaQuery } from "@vueuse/core";
import { computed, ref } from "vue";
import { useI18n } from "vue-i18n";

import ConfirmDialog from "@/components/common/ConfirmDialog.vue";
import { useThemeTexts } from "@/composables/texts/useThemeTexts";
import { PHONE_PREVIEW_SIDE_MEDIA_QUERY } from "@/constants/settings";
import { COLOR_MODES, MAX_THEME_NAME_LENGTH } from "@/core/themes/themeFormat";
import { useMessagesStore } from "@/stores/messagesStore";
import { useSettingsWindowStore } from "@/stores/settingsWindowStore";
import { useThemeEditorStore } from "@/stores/themeEditorStore";
import { useToastStore } from "@/stores/toastStore";
import {
  BUILT_IN_THEMES,
  STANDARD_THEME_ID,
  type ThemeDefinition,
} from "@/utils/themes/builtInThemes";
import { FLOOR_CODE } from "@/utils/themes/floorReport";

import ThemeContrastChecks from "./ThemeContrastChecks.vue";
import ThemeEditorFields from "./ThemeEditorFields.vue";
import ThemePhonePreview from "./ThemePhonePreview.vue";
import ThemePreview from "./ThemePreview.vue";

const SUMMARY_SEPARATOR = " ";

/**
 * The theme editor, a page below "Aussehen": four base colours and the three flow colours per
 * version, the rest derived, with previews and contrast warnings. The draft stays until "Speichern"
 * or "Verwerfen" (editor store).
 */
const { t } = useI18n();
const settingsWindow = useSettingsWindowStore();
const editor = useThemeEditorStore();
const messages = useMessagesStore();
const toasts = useToastStore();
const { themeName, reportText } = useThemeTexts();
const isWide = useMediaQuery(PHONE_PREVIEW_SIDE_MEDIA_QUERY);

const draft = computed(() => editor.draft);
const isConfirmingDiscard = ref(false);

/** Narrower than the side preview needs: the phone takes the normal preview's place. */
const isPhoneInside = computed(
  () => editor.isPhonePreviewShown && !settingsWindow.isListLayout && !isWide.value,
);
const phoneToggleText = computed(() => {
  const key = editor.isPhonePreviewShown ? "phonePreviewHide" : "phonePreviewShow";
  return t(`settings.appearance.editor.${key}`);
});

function startLabel(theme: ThemeDefinition): string {
  if (theme.id === STANDARD_THEME_ID) return t("settings.appearance.editor.startEmpty");

  return t("settings.appearance.editor.startFrom", { name: themeName(theme) });
}

function changeStart(event: Event): void {
  const id = (event.target as HTMLSelectElement).value;
  const theme = BUILT_IN_THEMES.find((entry) => entry.id === id);
  if (theme) editor.changeStart(theme);
}

/** "Abbrechen": asks once when something changed. */
function cancel(): void {
  if (editor.isDirty) {
    isConfirmingDiscard.value = true;
    return;
  }
  discardAndLeave();
}

function discardAndLeave(): void {
  isConfirmingDiscard.value = false;
  editor.discard();
  settingsWindow.back();
}

async function save(): Promise<void> {
  try {
    const saved = await editor.save(t("settings.appearance.editor.defaultName"));
    if (!saved) return;

    // What the floor adjusts is said right away
    const adjusted = saved.findings.filter((finding) => finding.code !== FLOOR_CODE.readable);
    const details = adjusted.map(reportText).join(SUMMARY_SEPARATOR);
    const messageKey = details ? "savedAdjusted" : "saved";
    toasts.show({
      text: t(`settings.appearance.editor.${messageKey}`, { name: saved.name, details }),
    });
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
.theme-editor {
  display: flex;
  flex-direction: column;
  min-height: 100%;
}

.theme-editor__content {
  display: grid;
  flex: 1;
  align-content: start;
  gap: 14px;
}

.theme-editor__head {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
}

.theme-editor__name {
  flex: 1 1 180px;
  min-width: 0;
  height: 32px;
  padding: 0 10px;
  border: 1px solid var(--line-strong);
  border-radius: 8px;
  background: var(--surface);
  color: var(--fg);
  font-weight: 600;
}

.theme-editor__modes {
  display: flex;
  gap: 2px;
  padding: 3px;
  border-radius: 9px;
  background: var(--sunken);
}

.theme-editor__mode {
  padding: 5px 10px;
  border: 0;
  border-radius: 7px;
  background: none;
  color: var(--muted);
  font-size: 12.5px;
  font-weight: 600;
  cursor: pointer;
}

.theme-editor__mode--on {
  background: var(--surface);
  color: var(--fg);
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.08);
}

.theme-editor__dark-only {
  color: var(--muted);
}

.theme-editor__columns {
  display: grid;
  grid-template-columns: minmax(220px, 300px) minmax(0, 1fr);
  gap: 18px;
  align-items: start;
}

.theme-editor__preview {
  display: grid;
  justify-items: center;
}

.theme-editor__preview > :not(.phone-preview) {
  justify-self: stretch;
}

.theme-editor__actions {
  position: sticky;
  bottom: -22px;
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
  margin: 16px -22px -22px;
  padding: 12px 22px;
  border-top: 1px solid var(--line);
  background: var(--surface);
}

.theme-editor__space {
  flex: 1;
}

@media (max-width: 820px) {
  .theme-editor__columns {
    grid-template-columns: minmax(0, 1fr);
  }

  .theme-editor__actions {
    bottom: -16px;
    margin: 16px -16px -16px;
    padding: 12px 16px;
  }
}
</style>
