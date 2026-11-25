<template>
  <div class="settings-card">
    <SettingsRow
      :title="t('settings.language')"
      :hint="t('settings.languageHint')"
      :preference="PREFERENCES.locale"
    >
      <select
        v-model="settings.locale"
        class="settings-select"
        :aria-label="t('settings.language')"
      >
        <option v-for="code in APP_LOCALES" :key="code" :value="code">
          {{ LOCALE_NAMES[code] }}
        </option>
      </select>
    </SettingsRow>

    <SettingsRow
      :title="t('settings.technicalDetails')"
      :hint="t('settings.technicalDetailsHint')"
      :preference="PREFERENCES.technicalDetails"
    >
      <SwitchToggle
        v-model="settings.isTechnicalDetailsVisible"
        :label="t('settings.technicalDetails')"
      />
    </SettingsRow>

    <SettingsRow
      :title="t('settings.paneWidths')"
      :hint="t('settings.paneWidthsHint')"
      :preference="PREFERENCES.paneWidths"
    >
      <button class="btn" type="button" @click="layout.resetPaneWidths()">
        {{ t("settings.reset") }}
      </button>
    </SettingsRow>
  </div>
</template>

<script setup lang="ts">
import { useI18n } from "vue-i18n";

import SwitchToggle from "@/components/common/SwitchToggle.vue";
import { PREFERENCES } from "@/constants/preferences";
import { APP_LOCALES, LOCALE_NAMES } from "@/i18n";
import { useLayoutStore } from "@/stores/layoutStore";
import { useSettingsStore } from "@/stores/settingsStore";

import SettingsRow from "./SettingsRow.vue";

const { t } = useI18n();
const settings = useSettingsStore();
const layout = useLayoutStore();
</script>
