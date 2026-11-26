<template>
  <p class="rules__lead">{{ t("entitySorting.rules.lead") }}</p>

  <div class="rules__list">
    <template v-for="(rule, index) in sorting.rules" :key="index">
      <SortingRuleEditor
        v-if="editing === index"
        :rule="rule"
        @save="(next) => replace({ index, rule: next })"
        @cancel="editing = null"
      />
      <div v-else class="rules__rule">
        <span class="rules__number">{{ index + 1 }}</span>
        <div class="rules__body">
          <template v-for="(condition, position) in rule.conditions" :key="position">
            <span v-if="position" class="rules__and">{{ t("entitySorting.rules.and") }}</span>
            <span class="rules__condition">{{
              texts.condition({ item: condition, home: sorting.home })
            }}</span>
          </template>
          <span class="rules__arrow">→</span>
          <span class="rules__target"
            ><span class="mdi mdi-folder-outline" />{{ texts.target(rule.target) }}</span
          >
          <span class="rules__meta">{{ statsText({ rule, index }) }}</span>
        </div>
        <div class="rules__actions">
          <button
            class="icon-btn"
            type="button"
            :disabled="index === 0"
            :aria-label="t('entitySorting.rules.up')"
            :title="t('entitySorting.rules.up')"
            @click="swap({ first: index, second: index - 1 })"
          >
            <span class="mdi mdi-arrow-up" />
          </button>
          <button
            class="icon-btn"
            type="button"
            :disabled="index === sorting.rules.length - 1"
            :aria-label="t('entitySorting.rules.down')"
            :title="t('entitySorting.rules.down')"
            @click="swap({ first: index, second: index + 1 })"
          >
            <span class="mdi mdi-arrow-down" />
          </button>
          <button
            class="icon-btn"
            type="button"
            :aria-label="t('entitySorting.rules.edit')"
            :title="t('entitySorting.rules.edit')"
            @click="editing = index"
          >
            <span class="mdi mdi-pencil-outline" />
          </button>
          <button
            class="icon-btn"
            type="button"
            :aria-label="t('entitySorting.rules.delete')"
            :title="t('entitySorting.rules.delete')"
            @click="remove(index)"
          >
            <span class="mdi mdi-delete-outline" />
          </button>
        </div>
      </div>
    </template>
    <p v-if="!sorting.rules.length && editing !== NEW" class="rules__empty">
      {{ t("entitySorting.rules.empty") }}
    </p>
    <SortingRuleEditor v-if="editing === NEW" :rule="null" @save="add" @cancel="editing = null" />
  </div>

  <div class="rules__tools">
    <button v-if="editing === null" class="btn" type="button" @click="editing = NEW">
      {{ t("entitySorting.rules.add") }}
    </button>
    <template v-if="ideas.length">
      <span class="rules__ideas-label">{{ t("entitySorting.rules.ideas") }}</span>
      <button
        v-for="(idea, index) in ideas"
        :key="index"
        class="rules__idea"
        type="button"
        @click="add(idea)"
      >
        {{
          idea.conditions
            .map((condition) => texts.condition({ item: condition, home: sorting.home }))
            .join(" · ")
        }}
        →
        {{ texts.target(idea.target) }}
        <span class="rules__idea-count">{{ ideaCount(idea) }}</span>
      </button>
    </template>
  </div>

  <section class="rules__summary">
    <div class="rules__summary-line">
      <span>{{ t("entitySorting.rules.covered", { count: coverage.covered }) }}</span>
      <span>
        {{
          coverage.conflicts
            ? t("entitySorting.rules.conflicts", { count: coverage.conflicts })
            : t("entitySorting.rules.noConflicts")
        }}
      </span>
    </div>
    <div class="rules__option">
      <SwitchToggle
        :model-value="sorting.options.isResortingSorted"
        :label="t('entitySorting.rules.resort')"
        @update:model-value="(value) => sorting.setOptions({ isResortingSorted: value })"
      />
      <div>
        <b>{{ t("entitySorting.rules.resort") }}</b>
        <small>{{ t("entitySorting.rules.resortHint") }}</small>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, ref } from "vue";
import { useI18n } from "vue-i18n";

import SwitchToggle from "@/components/common/SwitchToggle.vue";
import { useSortingRuleActions } from "@/composables/actions/useSortingRuleActions";
import { useSortingTexts } from "@/composables/texts/useSortingTexts";
import { useEntitySortingStore } from "@/stores/entitySortingStore";
import type { SortingRule } from "@/types/entitySorting";
import { ruleIdeas } from "@/utils/entitySorting/ruleIdeas";
import { ruleCoverage, ruleScope, ruleSideHits, ruleStats } from "@/utils/entitySorting/rules";

import SortingRuleEditor from "./SortingRuleEditor.vue";

/** Step 2: the user's own rules, optional. They are saved right away and act only in this tool. */
const NEW = -1;

const { t } = useI18n();
const sorting = useEntitySortingStore();
const texts = useSortingTexts();
/** Index of the rule being edited, NEW for a new one, null for none. */
const editing = ref<number | null>(null);
const { add, replace, swap, remove } = useSortingRuleActions({ editing });

const scope = computed(() =>
  ruleScope({
    entities: sorting.home?.context.entities ?? [],
    isResortingSorted: sorting.options.isResortingSorted,
    includeHidden: sorting.options.includeHidden,
  }),
);

const coverage = computed(() =>
  sorting.home
    ? ruleCoverage({ entities: scope.value, rules: sorting.rules, home: sorting.home })
    : { covered: 0, conflicts: 0 },
);

const ideas = computed(() =>
  sorting.home && sorting.computation
    ? ruleIdeas({ home: sorting.home, computation: sorting.computation, rules: sorting.rules })
    : [],
);

/** "42 Entitäten": what an idea would catch, so the user sees what it is worth. */
function ideaCount(idea: SortingRule): string {
  if (!sorting.home) return "";

  const { matches } = ruleStats({
    rule: idea,
    ruleIndex: null,
    rules: sorting.rules,
    entities: scope.value,
    home: sorting.home,
  });
  return t("entitySorting.entities", { count: matches }, matches);
}

/** What the rule catches, what another rule decides, and why it may catch less than expected. */
function statsText({ rule, index }: { rule: SortingRule; index: number }): string {
  const home = sorting.home;
  if (!home) return "";

  const stats = ruleStats({
    rule,
    ruleIndex: index,
    rules: sorting.rules,
    entities: scope.value,
    home,
  });
  const sideHits = ruleSideHits({
    rule,
    home,
    isResortingSorted: sorting.options.isResortingSorted,
  });

  return texts.ruleLine({ stats, sideHits });
}
</script>

<style scoped>
.rules__lead {
  max-width: 76ch;
  margin: 0 0 16px;
  color: var(--muted);
}

.rules__list {
  display: grid;
  gap: 8px;
}

.rules__rule {
  display: grid;
  grid-template-columns: 26px minmax(0, 1fr) auto;
  align-items: center;
  gap: 12px;
  padding: 10px 10px 10px 12px;
  border: 1px solid var(--line);
  border-radius: 12px;
}

.rules__number {
  display: grid;
  place-items: center;
  width: 24px;
  height: 24px;
  border-radius: 7px;
  background: var(--sunken);
  color: var(--muted);
  font-size: 12px;
  font-weight: 700;
}

.rules__body {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px;
  min-width: 0;
}

.rules__condition {
  padding: 2px 8px;
  border-radius: 6px;
  background: var(--sunken);
  font-size: 13px;
}

.rules__and {
  color: var(--faint);
  font-size: 10.5px;
  font-weight: 700;
  letter-spacing: 0.08em;
}

.rules__arrow {
  color: var(--faint);
}

.rules__target {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  font-weight: 700;
}

.rules__target .mdi {
  color: var(--faint);
}

.rules__meta {
  width: 100%;
  color: var(--muted);
  font-size: 12.5px;
}

.rules__actions {
  display: flex;
}

.rules__empty {
  margin: 0;
  color: var(--muted);
}

.rules__tools {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
  margin-top: 12px;
}

.rules__ideas-label {
  color: var(--muted);
  font-size: 13px;
}

.rules__idea {
  padding: 2px 10px;
  border: 1px dashed var(--line-strong);
  border-radius: 999px;
  background: transparent;
  cursor: pointer;
  font-size: 12.5px;
}

.rules__idea-count {
  margin-left: 4px;
  color: var(--muted);
  font-weight: 600;
}

.rules__idea:hover {
  border-color: var(--accent);
  border-style: solid;
  color: var(--accent);
}

.rules__summary {
  display: grid;
  gap: 12px;
  margin-top: 16px;
  padding: 16px;
  border: 1px solid var(--line);
  border-radius: 12px;
}

.rules__summary-line {
  display: flex;
  flex-wrap: wrap;
  gap: 14px;
  font-size: 13.5px;
}

.rules__option {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr);
  gap: 12px;
}

.rules__option small {
  display: block;
  color: var(--muted);
  font-size: 12.5px;
}
</style>
