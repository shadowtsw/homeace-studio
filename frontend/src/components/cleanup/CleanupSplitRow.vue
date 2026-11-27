<template>
  <div class="cleanup__row" :class="{ 'cleanup__row--on': isOn }">
    <input
      v-model="isOn"
      type="checkbox"
      :aria-label="t('cleanup.convert', { name: choice.from })"
    />
    <div class="cleanup__main">
      <div class="cleanup__map">
        <code>{{ choice.from }}</code>
        <span class="mdi mdi-arrow-right cleanup__arrow" />
        <input
          v-model="to"
          class="field-input cleanup__target"
          :aria-label="t('cleanup.targetFor', { name: choice.from })"
          @change="isOn = to.trim() !== ''"
        />
      </div>
      <div class="cleanup__meta">
        <span>{{ countsText(choice.counts) }}</span>
        <span v-if="!normalizeFolderPath(to)" class="cleanup__tag cleanup__tag--warn">
          <span class="mdi mdi-alert-circle-outline" />{{ t("cleanup.invalidPath") }}
        </span>
        <span v-if="!choice.isCertain" class="cleanup__tag cleanup__tag--warn">
          <span class="mdi mdi-help-circle-outline" />{{ t("cleanup.uncertain") }}
        </span>
        <span v-if="sameTarget" class="cleanup__tag">
          <span class="mdi mdi-call-merge" />{{
            t("cleanup.sameTarget", { name: sameTarget?.from ?? "" })
          }}
        </span>
        <span v-else-if="isExistingFolder" class="cleanup__tag">
          <span class="mdi mdi-call-merge" />{{ t("cleanup.targetExists") }}
        </span>
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
import { computed } from "vue";
import { useI18n } from "vue-i18n";

import { useCleanupTexts } from "@/composables/texts/useCleanupTexts";
import {
  normalizeFolderPath,
  sameTargetAs,
  type CleanupChoice,
  type SplitChoice,
} from "@/utils/categories/cleanupSelection";

/** One line of the tidy-up assistant: a name with a dash becomes a folder path (editable). */
const isOn = defineModel<boolean>("isOn", { required: true });
/** The folder path the name becomes. */
const to = defineModel<string>("to", { required: true });

const props = defineProps<{
  choice: SplitChoice;
  /** All lines, to see when two of them lead to the same folder. */
  choices: CleanupChoice[];
  /** Existing folder paths; a target may join one of them. */
  allPaths: string[];
}>();

const emit = defineEmits<{
  /** "Ausblenden": the proposal is hidden from now on. */
  hide: [];
}>();

const { t } = useI18n();
const { countsText } = useCleanupTexts();

/** Another ticked line that leads to the same folder; both then share it. */
const sameTarget = computed(() => sameTargetAs({ choice: props.choice, choices: props.choices }));
const isExistingFolder = computed(() => {
  const target = normalizeFolderPath(to.value);

  return target !== null && target !== props.choice.from && props.allPaths.includes(target);
});
</script>

<style scoped src="./cleanupDialog.css"></style>
