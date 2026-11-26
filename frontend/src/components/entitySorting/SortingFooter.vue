<template>
  <template v-if="sorting.step === SORTING_STEP.overview">
    <span class="sorting-footer__info">{{ t("entitySorting.overview.nothingChanges") }}</span>
    <button class="btn" type="button" @click="emit('close')">{{ t("entitySorting.close") }}</button>
    <!-- Without rules, the rules come first: a few of them make the rest far more precise. -->
    <button
      class="btn"
      :class="{ 'btn--primary': !hasRules }"
      type="button"
      :disabled="!sorting.home"
      @click="sorting.goTo(SORTING_STEP.rules)"
    >
      {{
        hasRules
          ? t("entitySorting.overview.toRulesCount", { count: sorting.rules.length })
          : t("entitySorting.overview.toRules")
      }}
    </button>
    <button
      class="btn"
      :class="{ 'btn--primary': hasRules }"
      type="button"
      :disabled="!sorting.home"
      @click="sorting.goTo(SORTING_STEP.suggestions)"
    >
      {{ t("entitySorting.overview.toSuggestions") }}
    </button>
  </template>

  <template v-else-if="sorting.step === SORTING_STEP.rules">
    <span class="sorting-footer__info">{{ placeholderHint }}</span>
    <button class="btn" type="button" @click="sorting.goTo(SORTING_STEP.overview)">
      {{ t("entitySorting.back") }}
    </button>
    <button class="btn btn--primary" type="button" @click="sorting.goTo(SORTING_STEP.suggestions)">
      {{ t("entitySorting.overview.toSuggestions") }}
    </button>
  </template>

  <template v-else-if="sorting.step === SORTING_STEP.suggestions">
    <span class="sorting-footer__info">
      {{ tickedText }}
      <span class="sorting-footer__keys">· {{ t("entitySorting.suggestions.keys") }}</span>
    </span>
    <button class="btn" type="button" @click="sorting.goTo(SORTING_STEP.rules)">
      {{ t("entitySorting.back") }}
    </button>
    <button
      class="btn btn--primary"
      type="button"
      :disabled="isBusy || sorting.moves.length === 0"
      @click="emit('apply')"
    >
      <span class="mdi mdi-check" />
      {{ t("entitySorting.suggestions.apply", { count: sorting.moves.length }) }}
    </button>
  </template>

  <span v-else-if="sorting.step === SORTING_STEP.apply" class="sorting-footer__info">
    {{ t("entitySorting.apply.wait") }}
  </span>

  <template v-else>
    <span class="sorting-footer__info">{{ t("entitySorting.result.saved") }}</span>
    <button class="btn" type="button" :disabled="isBusy" @click="emit('close')">
      {{ t("entitySorting.done") }}
    </button>
    <button
      class="btn btn--primary"
      type="button"
      :disabled="isBusy"
      @click="sorting.goTo(SORTING_STEP.suggestions)"
    >
      {{ t("entitySorting.result.continue") }}
    </button>
  </template>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { useI18n } from "vue-i18n";

import { useSortingTexts } from "@/composables/useSortingTexts";
import { SORTING_STEP, useEntitySortingStore } from "@/stores/entitySortingStore";

/** The buttons of the current step, below the scrolling body. */
defineProps<{
  /** A run or an undo is going on. */
  isBusy: boolean;
}>();

const emit = defineEmits<{
  close: [];
  apply: [];
}>();

const { t } = useI18n();
const sorting = useEntitySortingStore();
const texts = useSortingTexts();
const hasRules = computed(() => sorting.rules.length > 0);

const placeholderHint = computed(() => {
  const words = texts.placeholderWords();

  return t("entitySorting.rules.placeholderHint", {
    area: `{${words.area}}`,
    floor: `{${words.floor}}`,
  });
});
const tickedText = computed(() =>
  t("entitySorting.suggestions.footer", {
    bundles: t(
      "entitySorting.suggestions.bundles",
      { count: sorting.tickedCount },
      sorting.tickedCount,
    ),
    entities: t("entitySorting.entities", { count: sorting.moves.length }, sorting.moves.length),
  }),
);
</script>

<style scoped>
.sorting-footer__info {
  margin-right: auto;
  color: var(--muted);
  font-size: 13px;
}

@media (max-width: 640px) {
  .sorting-footer__info {
    width: 100%;
  }

  .sorting-footer__keys {
    display: none;
  }
}

@media (pointer: coarse) {
  .sorting-footer__keys {
    display: none;
  }
}
</style>
