<template>
  <p class="settings-note">
    <span class="mdi mdi-information-outline" />
    {{ t("settings.toolsNote") }}
  </p>
  <div class="settings-card">
    <SettingsRow :title="t('settings.cleanup')" :hint="t('settings.cleanupHint')">
      <button class="btn" type="button" @click="emit('cleanup')">
        {{ t("settings.toolOpen") }}
      </button>
    </SettingsRow>
    <SettingsRow :title="t('areas.tidy.title')" :hint="t('settings.tidyHint')">
      <button class="btn" type="button" @click="emit('tidy')">
        {{ t("settings.toolOpen") }}
      </button>
    </SettingsRow>
  </div>
</template>

<script setup lang="ts">
import { useI18n } from "vue-i18n";

import SettingsRow from "./SettingsRow.vue";

/** Tools run in steps, so each opens its own window; nothing changes before its preview. */
const emit = defineEmits<{
  cleanup: [];
  tidy: [];
}>();

const { t } = useI18n();
</script>
