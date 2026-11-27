<template>
  <RouterView />
</template>

<script setup lang="ts">
import { watchEffect } from "vue";
import { useI18n } from "vue-i18n";

import { useMessagesStore } from "@/stores/messagesStore";
import { usePreferencesStore } from "@/stores/preferencesStore";
import { useSettingsStore } from "@/stores/settingsStore";
import { useThemeStore } from "@/stores/themeStore";

const settings = useSettingsStore();
const messages = useMessagesStore();
const { locale } = useI18n();

// The theme's colours are set before the app's first picture, from this browser's copy
useThemeStore();

// Settings that follow the HA user: the backend's values replace the browser's copy.
void usePreferencesStore().load();

// The chosen language lives in the settings store; i18n, <html lang> and the backend's
// message catalog (texts for error IDs) follow it.
watchEffect(() => {
  locale.value = settings.locale;
  document.documentElement.lang = settings.locale;
  void messages.load(settings.locale);
});
</script>
