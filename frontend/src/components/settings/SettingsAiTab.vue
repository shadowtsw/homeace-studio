<template>
  <p class="settings-note">
    <span class="mdi mdi-home-outline" />
    {{ t("settings.aiNote") }}
  </p>
  <McpSettingsPanel />
</template>

<script setup lang="ts">
import { useI18n } from "vue-i18n";

import McpSettingsPanel from "@/components/ai/McpSettingsPanel.vue";

/** The AI access belongs to the whole add-on, so it has no person or screen symbol. */
const { t } = useI18n();
</script>
