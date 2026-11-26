<template>
  <div class="choice-list">
    <input
      v-if="isSearchable"
      ref="searchInput"
      v-model="query"
      class="field-input choice-list__search"
      type="search"
      autocomplete="off"
      :placeholder="t('flow.edit.search')"
    />
    <div class="choice-list__items" role="listbox" :aria-multiselectable="isMultiple">
      <button
        v-for="option in visibleOptions"
        :key="option.value"
        type="button"
        role="option"
        class="choice-list__item"
        :class="{ 'choice-list__item--danger': option.isDanger }"
        :aria-selected="selected.includes(option.value)"
        @click="emit('pick', option.value)"
      >
        <span v-if="option.icon" class="mdi choice-list__icon" :class="option.icon" />
        <span class="choice-list__main">
          <span>{{ option.label }}</span>
          <small v-if="option.sub" :class="{ 'choice-list__sub--plain': option.isSubPlain }">{{
            option.sub
          }}</small>
        </span>
        <span v-if="selected.includes(option.value)" class="mdi mdi-check choice-list__check" />
      </button>
      <p v-if="visibleOptions.length === 0" class="choice-list__empty">
        {{ t("flow.edit.nothingFound") }}
      </p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { useI18n } from "vue-i18n";

import type { ChoiceOption } from "@/types/editor";

export type ListOption = ChoiceOption;

/** Long lists (1700+ entities) only show this many until the user searches. */
const MAX_VISIBLE = 250;

const props = defineProps<{
  options: ListOption[];
  selected: string[];
  isMultiple: boolean;
  isSearchable: boolean;
}>();

const emit = defineEmits<{ pick: [value: string] }>();

const { t } = useI18n();

const query = ref("");
const searchInput = ref<HTMLInputElement | null>(null);

const visibleOptions = computed(() => {
  const needle = query.value.trim().toLowerCase();
  const matching = needle
    ? props.options.filter(
        (option) =>
          option.label.toLowerCase().includes(needle) ||
          option.value.toLowerCase().includes(needle),
      )
    : props.options;

  return matching.slice(0, MAX_VISIBLE);
});

onMounted(() => searchInput.value?.focus({ preventScroll: true }));
</script>

<style scoped>
.choice-list {
  display: grid;
  gap: 6px;
  min-height: 0;
}

.choice-list__items {
  display: grid;
  gap: 1px;
  max-height: 280px;
  overflow: auto;
}

.choice-list__item {
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;
  padding: 8px 9px;
  border: 0;
  border-radius: 8px;
  background: none;
  text-align: left;
  cursor: pointer;
}

.choice-list__item:hover,
.choice-list__item:focus-visible {
  background: var(--sunken);
}

.choice-list__check {
  color: var(--accent);
  font-size: 18px;
}

.choice-list__icon {
  color: var(--muted);
  font-size: 18px;
}

.choice-list__item--danger,
.choice-list__item--danger .choice-list__icon {
  color: var(--err);
}

.choice-list__main {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
}

.choice-list__main span,
.choice-list__main small {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.choice-list__main small {
  color: var(--faint);
  font: 11px var(--font-mono);
}

/* Plain subtitles are short sentences (what a choice does); they wrap instead of being cut. */
.choice-list__main small.choice-list__sub--plain {
  font: 12px var(--font-body);
  white-space: normal;
}

.choice-list__empty {
  margin: 0;
  padding: 12px;
  color: var(--muted);
  text-align: center;
}
</style>
