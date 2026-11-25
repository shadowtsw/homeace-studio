<template>
  <div class="settings-card">
    <SettingsRow
      :title="t('settings.autoSaveScenes')"
      :hint="t('settings.autoSaveScenesHint')"
      :preference="PREFERENCES.sceneAutoSave"
    >
      <SwitchToggle v-model="settings.isSceneAutoSave" :label="t('settings.autoSaveScenes')" />
    </SettingsRow>
  </div>
</template>

<script setup lang="ts">
import { useI18n } from "vue-i18n";

import SwitchToggle from "@/components/common/SwitchToggle.vue";
import { PREFERENCES } from "@/constants/preferences";
import { useSettingsStore } from "@/stores/settingsStore";

import SettingsRow from "./SettingsRow.vue";

/** Settings for the editors. A setting only comes when users really want it differently. */
const { t } = useI18n();
const settings = useSettingsStore();
</script>
