<template>
  <div class="theme-actions">
    <span class="theme-actions__text">
      <b>{{ themeName(themeStore.theme) }}</b>
      <small>{{ hint }}</small>
    </span>
    <template v-if="isOwn">
      <button class="btn btn--sm" type="button" @click="editOwn">
        <span class="mdi mdi-palette-outline" />{{ t("settings.appearance.editor.editOwn") }}
      </button>
      <button class="btn btn--sm" type="button" @click="sharing.exportFile(themeStore.theme)">
        <span class="mdi mdi-download-outline" />{{ t("settings.appearance.export") }}
      </button>
      <button class="btn btn--sm" type="button" @click="sharing.copyText(themeStore.theme)">
        <span class="mdi mdi-content-copy" />{{ t("settings.appearance.copy") }}
      </button>
      <button class="btn btn--sm" type="button" @click="isConfirmingDelete = true">
        <span class="mdi mdi-delete-outline" />{{ t("settings.appearance.delete") }}
      </button>
    </template>
    <button v-else class="btn btn--sm" type="button" @click="editCopy">
      <span class="mdi mdi-content-duplicate" />{{ t("settings.appearance.editor.editCopy") }}
    </button>
  </div>

  <ConfirmDialog
    v-if="isConfirmingDelete"
    :title="t('settings.appearance.deleteTitle', { name: themeName(themeStore.theme) })"
    :text="t('settings.appearance.deleteText')"
    :confirm-label="t('settings.appearance.delete')"
    :is-busy="isDeleting"
    @cancel="isConfirmingDelete = false"
    @confirm="deleteTheme"
  />
</template>

<script setup lang="ts">
import { computed, ref } from "vue";
import { useI18n } from "vue-i18n";

import ConfirmDialog from "@/components/common/ConfirmDialog.vue";
import { useThemeTexts } from "@/composables/texts/useThemeTexts";
import { useThemeSharing } from "@/composables/useThemeSharing";
import { useMessagesStore } from "@/stores/messagesStore";
import { useOwnThemesStore } from "@/stores/ownThemesStore";
import { useThemeEditorStore } from "@/stores/themeEditorStore";
import { useThemeStore } from "@/stores/themeStore";
import { useToastStore } from "@/stores/toastStore";
import { STANDARD_THEME_ID } from "@/utils/themes/builtInThemes";

/**
 * What can be done with the chosen theme. Own ones: edit, share as a file or as text, delete.
 * Ready-made ones are only edited as a copy; they are not shared (owner's decision 2026-11-27):
 * everyone has them already, and a file holds only the seven colours, not Standard's exact values.
 */
const { t } = useI18n();
const themeStore = useThemeStore();
const ownThemes = useOwnThemesStore();
const messages = useMessagesStore();
const toasts = useToastStore();
const sharing = useThemeSharing();
const themeEditor = useThemeEditorStore();
const { themeName } = useThemeTexts();

const isConfirmingDelete = ref(false);
const isDeleting = ref(false);
const isOwn = computed(() => Boolean(themeStore.theme.ownName));
const hintKey = computed(() =>
  isOwn.value ? "settings.appearance.ownHint" : "settings.appearance.readyMadeHint",
);
const hint = computed(() => t(hintKey.value));

function editOwn(): void {
  void themeEditor.open({ kind: "edit", theme: themeStore.theme });
}

/** "Als Kopie bearbeiten": a ready-made theme is never changed itself. */
function editCopy(): void {
  const name = t("settings.appearance.editor.copyName", { name: themeName(themeStore.theme) });
  void themeEditor.open({ kind: "new", theme: themeStore.theme, name });
}

async function deleteTheme(): Promise<void> {
  const name = themeName(themeStore.theme);
  isDeleting.value = true;
  try {
    await ownThemes.remove(themeStore.theme.id);
    // The deleted theme was on: Standard takes over
    themeStore.selectTheme(STANDARD_THEME_ID);
    toasts.show({ text: t("settings.appearance.deleted", { name }) });
  } catch (error) {
    toasts.show({
      text: messages.textFor({ error, fallback: t("errors.actionFailed") }),
      tone: "error",
    });
  } finally {
    isDeleting.value = false;
    isConfirmingDelete.value = false;
  }
}
</script>

<style scoped>
.theme-actions {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
  padding: 10px 12px;
  border-radius: 10px;
  background: var(--sunken);
}

.theme-actions__text {
  display: grid;
  flex: 1 1 180px;
  min-width: 0;
}

.theme-actions__text b {
  overflow: hidden;
  font-size: 13px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.theme-actions__text small {
  color: var(--muted);
  font-size: 12px;
}
</style>
