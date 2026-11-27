<template>
  <div class="cleanup__row" :class="{ 'cleanup__row--on': isOn }">
    <input
      v-model="isOn"
      type="checkbox"
      :aria-label="t('cleanup.merge', { names: choice.names.join(t('cleanup.and')) })"
    />
    <div class="cleanup__main">
      <div class="cleanup__map">
        <template v-for="(name, index) in choice.names" :key="name">
          <span v-if="index > 0" class="cleanup__arrow">+</span>
          <code>{{ name }}</code>
        </template>
      </div>
      <div class="cleanup__meta">
        <span v-for="name in choice.names" :key="name">
          {{ name }}: {{ countsText(choice.counts[name] ?? {}) }}
        </span>
      </div>
      <div class="cleanup__radios" role="radiogroup" :aria-label="t('cleanup.mergeName')">
        <span class="cleanup__meta">{{ t("cleanup.mergeName") }}</span>
        <label v-for="name in choice.names" :key="name">
          <input v-model="to" type="radio" :name="choice.key" :value="name" />
          {{ name }}
        </label>
      </div>
    </div>
    <button
      class="icon-btn"
      type="button"
      :title="t('cleanup.hide')"
      :aria-label="t('cleanup.hide')"
      @click="emit('hide')"
    >
      <span class="mdi mdi-eye-off-outline" />
    </button>
  </div>
</template>

<script setup lang="ts">
import { useI18n } from "vue-i18n";

import { useCleanupTexts } from "@/composables/texts/useCleanupTexts";
import type { MergeChoice } from "@/utils/categories/cleanupSelection";

/** One line of the tidy-up assistant: several category names become one; a radio picks which stays. */
const isOn = defineModel<boolean>("isOn", { required: true });
/** The name that stays. */
const to = defineModel<string>("to", { required: true });

defineProps<{
  choice: MergeChoice;
}>();

const emit = defineEmits<{
  /** "Ausblenden": the proposal is hidden from now on. */
  hide: [];
}>();

const { t } = useI18n();
const { countsText } = useCleanupTexts();
</script>

<style scoped src="./cleanupDialog.css"></style>
