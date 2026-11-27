<template>
  <p class="cleanup__intro">{{ t("cleanup.previewIntro") }}</p>
  <div v-for="group in stepGroups" :key="group.scope" class="cleanup__scope">
    <h4>{{ scopeText(group.scope) }}</h4>
    <div
      v-for="item in group.steps"
      :key="item.from"
      class="cleanup__step"
      :class="{ 'cleanup__step--merge': item.kind === 'merge' }"
    >
      <span class="mdi" :class="item.kind === 'merge' ? 'mdi-call-merge' : 'mdi-pencil-outline'" />
      <div>
        <div class="cleanup__map">
          <code>{{ item.from }}</code>
          <span class="mdi mdi-arrow-right cleanup__arrow" />
          <code>{{ item.to }}</code>
        </div>
        <small>{{ stepText(item) }}</small>
        <small v-if="settings.isTechnicalDetailsVisible" class="cleanup__api">
          {{ apiText(item) }}
        </small>
      </div>
    </div>
  </div>
  <p class="cleanup__hint">
    <span class="mdi mdi-information-outline" />{{ t("cleanup.undoHint") }}
  </p>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { useI18n } from "vue-i18n";

import { useCleanupTexts } from "@/composables/texts/useCleanupTexts";
import { CLEANUP_SCOPE_ORDER } from "@/constants/cleanup";
import type { CleanupStep } from "@/services/cleanupService";
import { useSettingsStore } from "@/stores/settingsStore";

/** The second step of the tidy-up assistant: what HA will do, grouped by scope. */
const props = defineProps<{
  steps: CleanupStep[];
}>();

const { t } = useI18n();
const settings = useSettingsStore();
const { scopeText, stepText, apiText } = useCleanupTexts();

const stepGroups = computed(() =>
  CLEANUP_SCOPE_ORDER.map((scope) => ({
    scope,
    steps: props.steps.filter((item) => item.scope === scope),
  })).filter((group) => group.steps.length > 0),
);
</script>

<style scoped src="./cleanupDialog.css"></style>
