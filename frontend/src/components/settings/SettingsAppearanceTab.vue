<template>
  <p class="settings-note">
    <span class="mdi mdi-palette-outline" />
    {{ t("settings.appearanceSoon") }}
  </p>
</template>

<script setup lang="ts">
import { useI18n } from "vue-i18n";

/** "Aussehen": the place of the themes and of light or dark, which come next in 0.15. */
const { t } = useI18n();
</script>
