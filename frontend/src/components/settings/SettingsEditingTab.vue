<template>
  <div class="settings-card">
    <SettingsRow
      :title="t('settings.autoSaveScenes')"
      :hint="t('settings.autoSaveScenesHint')"
      :preference="PREFERENCES.sceneAutoSave"
    >
      <SwitchToggle v-model="settings.isSceneAutoSave" :label="t('settings.autoSaveScenes')" />
    </SettingsRow>

    <SettingsRow
      :title="t('settings.storedTraces')"
      :hint="t('settings.storedTracesHint')"
      :preference="PREFERENCES.storedTraces"
    >
      <select
        v-model.number="settings.storedTraces"
        class="settings-select"
        :aria-label="t('settings.storedTraces')"
      >
        <option v-for="count in STORED_TRACES_CHOICES" :key="count" :value="count">
          {{
            count === DEFAULT_STORED_TRACES ? t("settings.storedTracesDefault", { count }) : count
          }}
        </option>
      </select>
    </SettingsRow>
  </div>
</template>

<script setup lang="ts">
import { useI18n } from "vue-i18n";

import SwitchToggle from "@/components/common/SwitchToggle.vue";
import { PREFERENCES } from "@/constants/preferences";
import { DEFAULT_STORED_TRACES, STORED_TRACES_CHOICES } from "@/constants/traces";
import { useSettingsStore } from "@/stores/settingsStore";

import SettingsRow from "./SettingsRow.vue";

/** Settings for the editors. A setting only comes when users really want it differently. */
const { t } = useI18n();
const settings = useSettingsStore();
</script>
