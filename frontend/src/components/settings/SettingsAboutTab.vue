<template>
  <div class="settings-card">
    <SettingsRow
      :title="t('settings.version', { version: APP_VERSION })"
      :hint="t('settings.whatsNewHint')"
    >
      <button v-if="whatsNew.hasHighlights" class="btn" type="button" @click="emit('whatsNew')">
        {{ t("settings.whatsNewOpen") }}
      </button>
    </SettingsRow>
    <SettingsRow :title="t('settings.allChanges')" :hint="t('settings.allChangesHint')">
      <a class="btn" :href="RELEASES_URL" target="_blank" rel="noopener noreferrer">
        <span class="mdi mdi-open-in-new" />{{ t("settings.toolOpen") }}
      </a>
    </SettingsRow>
    <SettingsRow :title="t('settings.issues')" :hint="t('settings.issuesHint')">
      <a class="btn" :href="ISSUES_URL" target="_blank" rel="noopener noreferrer">
        <span class="mdi mdi-open-in-new" />{{ t("settings.toolOpen") }}
      </a>
    </SettingsRow>
    <!-- Technical detail: which HA user the add-on sees; settings per user build on it. -->
    <SettingsRow
      v-if="settings.isTechnicalDetailsVisible && settingsWindow.detectedHaUser !== undefined"
      :title="t('settings.haUser')"
      :hint="haUserText"
    />
  </div>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { useI18n } from "vue-i18n";

import { ISSUES_URL } from "@/constants/settings";
import { RELEASES_URL } from "@/constants/whatsNew";
import { useSettingsStore } from "@/stores/settingsStore";
import { useSettingsWindowStore } from "@/stores/settingsWindowStore";
import { useWhatsNewStore } from "@/stores/whatsNewStore";

import SettingsRow from "./SettingsRow.vue";

/** Set at build time from the app version (vite.config.ts). */
const APP_VERSION = __APP_VERSION__;

const emit = defineEmits<{
  /** "Was ist neu" for the running version; the window closes for its popover. */
  whatsNew: [];
}>();

const { t } = useI18n();
const whatsNew = useWhatsNewStore();
const settings = useSettingsStore();
const settingsWindow = useSettingsWindowStore();

const haUserText = computed(() => {
  const user = settingsWindow.detectedHaUser;
  return user
    ? t("settings.haUserFound", { name: user.name, id: user.id })
    : t("settings.haUserMissing");
});
</script>
