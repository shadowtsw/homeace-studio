<template>
  <div v-if="visible.length" class="group-card" :class="{ 'group-card--open': isOpen }">
    <div class="group-card__head" @click="onHeadClick">
      <input
        v-if="tickable.length"
        class="group-card__check"
        type="checkbox"
        :checked="isAllTicked"
        :indeterminate="isSomeTicked"
        :aria-label="t('entitySorting.suggestions.wholeGroup')"
        @click.stop
        @change="tickAll"
      />
      <span v-else class="group-card__check-space" />

      <span class="group-card__title">
        <template v-if="group.type === 'new'">
          <span class="mdi mdi-folder-plus-outline" />
          <input
            class="field-input group-card__name"
            :value="groupTarget(group, sorting.groupNames) ?? ''"
            :aria-label="t('entitySorting.suggestions.folderName')"
            @click.stop
            @change="rename"
          />
          <span class="group-card__badge">
            {{ t("entitySorting.suggestions.newBadge", { origin: texts.origin(group.origin) }) }}
          </span>
        </template>
        <template v-else-if="group.type === 'system'">
          <span class="mdi mdi-cog-outline" />{{ t("entitySorting.suggestions.sectionSystem") }}
          <small>{{ t("entitySorting.suggestions.systemMeta") }}</small>
        </template>
        <template v-else-if="group.type === 'rest'">
          <span class="mdi mdi-help-circle-outline" />{{
            t("entitySorting.suggestions.sectionRest")
          }}
        </template>
        <template v-else><span class="mdi mdi-folder-outline" />{{ group.target }}</template>
      </span>

      <span class="group-card__meta">
        {{ t("entitySorting.suggestions.bundles", { count: visible.length }, visible.length) }} ·
        {{ t("entitySorting.entities", { count: entityCount }, entityCount) }}
      </span>
      <span class="group-card__dots" aria-hidden="true">
        <i
          v-for="bundle in visible.slice(0, MAX_DOTS)"
          :key="bundle.key"
          :class="`group-card__dot--${sorting.confidenceOf(bundle.key)}`"
        />
      </span>
      <span class="group-card__hints">{{ hintSummary }}</span>
      <!-- A real button, so the group opens with the keyboard and screen readers hear its state -->
      <button
        v-if="!isInSheet"
        type="button"
        class="group-card__chevron"
        :aria-expanded="isOpen"
        :aria-label="t('entitySorting.suggestions.toggleGroup')"
        @click.stop="onHeadClick"
      >
        <span class="mdi mdi-chevron-right" aria-hidden="true" />
      </button>
    </div>

    <div v-if="isOpen || isInSheet" class="group-card__rows">
      <SortingBundleRow
        v-for="bundle in visible"
        :key="bundle.key"
        :bundle="bundle"
        :group="group"
        :is-open="openBundles.has(bundle.key)"
        :folder-options="folderOptions"
        @toggle="toggleBundle(bundle.key)"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { useMediaQuery } from "@vueuse/core";
import { computed, ref } from "vue";
import { useI18n } from "vue-i18n";

import { useSortingTexts } from "@/composables/texts/useSortingTexts";
import { useEntitySortingStore } from "@/stores/entitySortingStore";
import { cleanFolderPath } from "@/utils/categories/categoryPath";
import { targetOf } from "@/utils/entitySorting/compute";
import type { SortingBundle, SortingGroup } from "@/utils/entitySorting/model";
import { groupTarget } from "@/utils/entitySorting/targets";

import SortingBundleRow from "./SortingBundleRow.vue";

/** A group of bundles with one target folder; on a phone it opens as a sheet instead. */
const props = defineProps<{
  group: SortingGroup;
  isOpen: boolean;
  folderOptions: string[];
  isInSheet?: boolean;
}>();

const emit = defineEmits<{
  toggle: [];
}>();

const MAX_DOTS = 12;

const { t } = useI18n();
const sorting = useEntitySortingStore();
const texts = useSortingTexts();
const isPhone = useMediaQuery("(max-width: 640px)");
const openBundles = ref(new Set<string>());

/** Bundles still offered and matching the filters and the search. */
const visible = computed(() => props.group.bundles.filter((bundle) => sorting.isVisible(bundle)));
const entityCount = computed(() =>
  visible.value.reduce((sum, bundle) => sum + bundle.entities.length, 0),
);
const targetFor = (bundle: SortingBundle): string | null =>
  targetOf(bundle, {
    state: sorting.state(),
    previous: sorting.computation,
    layout: sorting.layout,
  });
const tickable = computed(() => visible.value.filter((bundle) => targetFor(bundle)));
const tickedCount = computed(
  () => tickable.value.filter((bundle) => sorting.choices.get(bundle.key)?.isOn).length,
);
const isAllTicked = computed(
  () => tickable.value.length > 0 && tickedCount.value === tickable.value.length,
);
const isSomeTicked = computed(() => tickedCount.value > 0 && !isAllTicked.value);
const hintSummary = computed(() => {
  const kinds = new Set(
    visible.value.flatMap(
      (bundle) => sorting.computation?.suggestions.get(bundle.key)?.hintKinds ?? [],
    ),
  );

  return [...kinds].slice(0, 3).map(texts.hint).join(", ");
});

function tickAll(): void {
  const isOn = !isAllTicked.value;
  sorting.tickMany(
    tickable.value.map((bundle) => bundle.key),
    isOn,
  );
}

function rename(event: Event): void {
  const name = cleanFolderPath((event.target as HTMLInputElement).value);

  if (name) sorting.renameGroup(props.group.key, name);
}

function onHeadClick(): void {
  if (props.isInSheet) return;
  if (isPhone.value) sorting.sheetGroupKey = props.group.key;
  else emit("toggle");
}

function toggleBundle(key: string): void {
  const next = new Set(openBundles.value);
  if (!next.delete(key)) next.add(key);
  openBundles.value = next;
}
</script>

<style scoped>
.group-card {
  overflow: hidden;
  border: 1px solid var(--line);
  border-radius: 12px;
  background: var(--surface);
}

.group-card__head {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 10px;
  padding: 9px 10px 9px 12px;
  cursor: pointer;
}

.group-card__head:hover {
  background: var(--surface-2);
}

.group-card__check {
  width: 17px;
  height: 17px;
  margin: 0;
  accent-color: var(--accent);
}

.group-card__check-space {
  width: 17px;
}

.group-card__title {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  min-width: 0;
  font-weight: 700;
}

.group-card__title .mdi {
  color: var(--faint);
  font-size: 17px;
}

.group-card__title small {
  color: var(--muted);
  font-weight: 500;
}

.group-card__name {
  width: min(240px, 100%);
  height: 30px;
  font-weight: 700;
}

.group-card__badge {
  padding: 1px 7px;
  border-radius: 999px;
  background: var(--accent-soft);
  color: var(--accent);
  font-size: 11px;
  font-weight: 700;
  white-space: nowrap;
}

.group-card__meta {
  color: var(--muted);
  font-size: 12.5px;
  font-variant-numeric: tabular-nums;
}

.group-card__dots {
  display: inline-flex;
  gap: 3px;
}

.group-card__dots i {
  width: 8px;
  height: 8px;
  border-radius: 50%;
}

.group-card__dot--rule {
  background: var(--accent);
}

.group-card__dot--sure {
  background: var(--ok);
}

.group-card__dot--likely {
  background: var(--warn);
}

.group-card__dot--unclear {
  background: var(--line-strong);
}

.group-card__hints {
  margin-left: auto;
  color: var(--faint);
  font-size: 12.5px;
}

/* As small as the plain arrow it replaces, so the head keeps its height */
.group-card__chevron {
  display: inline-grid;
  flex: none;
  place-items: center;
  padding: 2px;
  border: 0;
  border-radius: 6px;
  background: transparent;
  color: var(--faint);
  font: inherit;
  cursor: pointer;
}

.group-card__chevron:hover {
  background: var(--sunken);
  color: var(--fg);
}

.group-card__chevron .mdi {
  transition: transform 0.15s;
}

.group-card--open .group-card__chevron .mdi {
  transform: rotate(90deg);
}
</style>
