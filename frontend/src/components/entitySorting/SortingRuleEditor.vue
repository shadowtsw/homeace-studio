<template>
  <form class="rule-editor" @submit.prevent="save">
    <div v-for="(condition, index) in conditions" :key="index" class="rule-editor__row">
      <span class="rule-editor__label">
        {{ index ? t("entitySorting.rules.and") : t("entitySorting.rules.when") }}
      </span>
      <select
        class="field-input"
        :value="condition.type"
        :aria-label="t('entitySorting.rules.when')"
        @change="
          setType({
            index,
            type: ($event.target as HTMLSelectElement).value as SortingConditionType,
          })
        "
      >
        <option v-for="type in CONDITION_TYPES" :key="type" :value="type">
          {{ texts.conditionType(type) }}
        </option>
      </select>
      <input
        v-if="condition.type === 'nameContains'"
        v-model="condition.value"
        class="field-input"
        :placeholder="t('entitySorting.rules.namePlaceholder')"
        :aria-label="texts.conditionType(condition.type)"
      />
      <select
        v-else
        v-model="condition.value"
        class="field-input"
        :aria-label="texts.conditionType(condition.type)"
      >
        <option value="">{{ t("entitySorting.rules.choose") }}</option>
        <option
          v-for="option in valueOptions(condition.type)"
          :key="option.value"
          :value="option.value"
        >
          {{ option.label }}
        </option>
      </select>
      <button
        v-if="conditions.length > 1"
        class="icon-btn"
        type="button"
        :aria-label="t('entitySorting.rules.removeCondition')"
        @click="conditions.splice(index, 1)"
      >
        <span class="mdi mdi-close" />
      </button>
    </div>

    <div class="rule-editor__row">
      <button
        class="btn btn--sm"
        type="button"
        @click="conditions.push({ type: 'integration', value: '' })"
      >
        {{ t("entitySorting.rules.addCondition") }}
      </button>
    </div>

    <div class="rule-editor__row">
      <span class="rule-editor__label">{{ t("entitySorting.rules.folder") }}</span>
      <FolderPathField
        ref="targetField"
        v-model="target"
        :folders="folderPaths"
        :label="t('entitySorting.rules.folder')"
        :placeholder="t('entitySorting.rules.targetPlaceholder', { example: areaToken })"
        appends-separator
      />
      <button
        class="btn btn--sm rule-editor__placeholder"
        type="button"
        @click="insert(words.area)"
      >
        {{ areaToken }}
      </button>
      <button
        class="btn btn--sm rule-editor__placeholder"
        type="button"
        @click="insert(words.floor)"
      >
        {{ floorToken }}
      </button>
    </div>

    <p class="rule-editor__preview">{{ preview }}</p>

    <div class="rule-editor__row rule-editor__buttons">
      <button class="btn" type="button" @click="emit('cancel')">
        {{ t("entitySorting.rules.cancel") }}
      </button>
      <button class="btn btn--primary" type="submit" :disabled="!isComplete">
        {{ t("entitySorting.rules.save") }}
      </button>
    </div>
  </form>
</template>

<script setup lang="ts">
import { computed, nextTick, ref, useTemplateRef } from "vue";
import { useI18n } from "vue-i18n";

import FolderPathField from "@/components/common/FolderPathField.vue";
import { useSortingTexts } from "@/composables/texts/useSortingTexts";
import { useEntitySortingStore } from "@/stores/entitySortingStore";
import type { SortingCondition, SortingConditionType, SortingRule } from "@/types/entitySorting";
import { CONDITION_TYPES } from "@/utils/entitySorting/constants";
import { fromDisplayTarget } from "@/utils/entitySorting/placeholders";
import { conditionValues, type ConditionValue } from "@/utils/entitySorting/ruleIdeas";
import { rulePreview, ruleScope } from "@/utils/entitySorting/rules";

/** One rule being written: AND-ed conditions, a folder with placeholders, and a live preview. */
const props = defineProps<{
  rule: SortingRule | null;
}>();

const emit = defineEmits<{
  save: [rule: SortingRule];
  cancel: [];
}>();

const MAX_EXAMPLES = 3;

const { t } = useI18n();
const sorting = useEntitySortingStore();
const texts = useSortingTexts();
const words = computed(() => texts.placeholderWords());
/** "{Bereich}", "{Etage}": the placeholders as the user types them. */
const areaToken = computed(() => `{${words.value.area}}`);
const floorToken = computed(() => `{${words.value.floor}}`);
const targetField = useTemplateRef("targetField");
/** Existing folders, for the tree and the suggestions while typing. */
const folderPaths = computed(() => [...(sorting.computation?.folders ?? [])].sort());

// The rule as written so far
const conditions = ref<SortingCondition[]>(
  props.rule
    ? props.rule.conditions.map((condition) => ({ ...condition }))
    : [{ type: "label", value: "" }],
);
const target = ref(props.rule ? texts.target(props.rule.target) : "");
const draft = computed<SortingRule>(() => ({
  conditions: conditions.value.filter((condition) => (condition.value ?? "").trim()),
  target: fromDisplayTarget({ text: target.value, words: words.value }),
}));
const isComplete = computed(() => draft.value.conditions.length > 0 && draft.value.target !== "");

// What it would do, as one sentence
const scope = computed(() =>
  ruleScope({
    entities: sorting.home?.context.entities ?? [],
    isResortingSorted: sorting.options.isResortingSorted,
    includeHidden: sorting.options.includeHidden,
  }),
);

const preview = computed(() => {
  const home = sorting.home;
  if (!isComplete.value || !home) return t("entitySorting.rules.previewEmpty");

  const facts = rulePreview({
    rule: draft.value,
    rules: sorting.rules,
    scope: scope.value,
    home,
    isResortingSorted: sorting.options.isResortingSorted,
    maxExamples: MAX_EXAMPLES,
  });

  return texts.rulePreview(facts);
});

/** Values that occur in this home, so a rule is picked rather than typed. */
function valueOptions(type: SortingConditionType): ConditionValue[] {
  return sorting.home ? conditionValues({ type, home: sorting.home }) : [];
}

function setType({ index, type }: { index: number; type: SortingConditionType }): void {
  conditions.value[index] = { type, value: "" };
}

/** Like typing: replaces marked text, and the cursor ends up behind the placeholder. */
async function insert(word: string): Promise<void> {
  const input = targetField.value?.input;
  const start = input?.selectionStart ?? target.value.length;
  const end = input?.selectionEnd ?? start;
  const token = `{${word}}`;

  target.value = `${target.value.slice(0, start)}${token}${target.value.slice(end)}`;
  await nextTick();
  input?.focus();
  input?.setSelectionRange(start + token.length, start + token.length);
}

function save(): void {
  if (isComplete.value) emit("save", draft.value);
}
</script>

<style scoped>
.rule-editor {
  display: grid;
  gap: 12px;
  padding: 14px;
  border: 1px solid var(--accent);
  border-radius: 12px;
  box-shadow: 0 0 0 3px var(--accent-soft);
}

.rule-editor__row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
}

.rule-editor__row > .field-input {
  flex: 1 1 160px;
  min-width: 0;
}

.rule-editor__label {
  min-width: 52px;
  font-size: 13px;
  font-weight: 600;
}

.rule-editor__placeholder {
  font-family: var(--font-mono);
}

.rule-editor__preview {
  margin: 0;
  padding: 8px 10px;
  border-radius: 8px;
  background: var(--surface-2);
  color: var(--muted);
  font-size: 13px;
}

.rule-editor__buttons {
  justify-content: flex-end;
}
</style>
