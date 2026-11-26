<template>
  <div
    class="bundle-row kb-row"
    :class="{ 'bundle-row--flash': isFlashing, 'bundle-row--open': isOpen }"
    tabindex="0"
    :data-bundle="bundle.key"
    @keydown="onKey"
  >
    <input
      class="bundle-row__check"
      type="checkbox"
      :checked="isTicked"
      :disabled="!target"
      :aria-label="t('entitySorting.suggestions.tickBundle', { name: bundle.name })"
      @change="sorting.tick({ key: bundle.key, isOn: ($event.target as HTMLInputElement).checked })"
    />
    <div class="bundle-row__main">
      <div class="bundle-row__line">
        <span class="bundle-row__name">{{ bundle.name }}</span>
        <span v-if="bundle.entities.length > 1" class="bundle-row__count">{{
          bundle.entities.length
        }}</span>
        <span
          class="bundle-row__pill"
          :class="`bundle-row__pill--${choice?.target ? 'own' : suggestion.confidence}`"
        >
          {{ texts.confidence(choice?.target ? "own" : suggestion.confidence) }}
        </span>
        <span v-if="change" class="bundle-row__change">{{ texts.change(change) }}</span>
        <span v-if="isTargetShown && target" class="bundle-row__target">
          → <span class="mdi mdi-folder-outline" />{{ target }}
        </span>
        <span v-if="suggestion.isUsedEverywhere && !suggestion.target" class="bundle-row__tag">
          {{ t("entitySorting.suggestions.everywhere") }}
        </span>
      </div>
      <div class="bundle-row__why">
        <span v-if="meta">{{ meta }}</span>
        <span v-if="meta && why"> — </span>
        <span>{{ why }}</span>
      </div>
      <SortingFolderPick
        :bundle-key="bundle.key"
        :target="target"
        :alternatives="alternatives"
        :folder-options="folderOptions"
      />
    </div>
    <div class="bundle-row__actions">
      <button
        v-if="canReject"
        class="icon-btn"
        type="button"
        :title="t('entitySorting.suggestions.reject')"
        :aria-label="t('entitySorting.suggestions.reject')"
        @click="reject"
      >
        <span class="mdi mdi-cancel" />
      </button>
      <button
        class="icon-btn"
        type="button"
        :title="t('entitySorting.suggestions.ignore')"
        :aria-label="t('entitySorting.suggestions.ignore')"
        @click="ignore"
      >
        <span class="mdi mdi-eye-off-outline" />
      </button>
      <button
        class="icon-btn"
        type="button"
        :title="t('entitySorting.suggestions.showEntities')"
        :aria-label="t('entitySorting.suggestions.showEntities')"
        :aria-expanded="isOpen"
        @click="emit('toggle')"
      >
        <span class="mdi mdi-chevron-right bundle-row__chevron" />
      </button>
    </div>
  </div>
  <SortingBundleEntities v-if="isOpen" :bundle="bundle" />
</template>

<script setup lang="ts">
import { toRef } from "vue";
import { useI18n } from "vue-i18n";

import { useSortingTexts } from "@/composables/texts/useSortingTexts";
import { useSortingBundleRow } from "@/composables/useSortingBundleRow";
import { useEntitySortingStore } from "@/stores/entitySortingStore";
import { useToastStore } from "@/stores/toastStore";
import type { SortingBundle, SortingGroup } from "@/utils/entitySorting/model";

import SortingBundleEntities from "./SortingBundleEntities.vue";
import SortingFolderPick from "./SortingFolderPick.vue";

/** One bundle in step 3: tick, why, alternatives, own folder, and its entities when opened. */
const props = defineProps<{
  bundle: SortingBundle;
  group: SortingGroup;
  isOpen: boolean;
  /** Existing folders and new ones of this session, for "Anderer Ordner …". */
  folderOptions: string[];
}>();

const emit = defineEmits<{
  toggle: [];
}>();

const { t } = useI18n();
const sorting = useEntitySortingStore();
const toasts = useToastStore();
const texts = useSortingTexts();
const {
  suggestion,
  choice,
  target,
  isTicked,
  change,
  isFlashing,
  isTargetShown,
  canReject,
  alternatives,
  meta,
  why,
} = useSortingBundleRow({ bundle: toRef(props, "bundle"), group: toRef(props, "group") });

async function reject(): Promise<void> {
  const path = target.value;
  if (!path) return;

  await sorting.reject({ key: props.bundle.key, path });
  toasts.show({
    text: t("entitySorting.suggestions.rejectedToast", { path, name: props.bundle.name }),
  });
}

async function ignore(): Promise<void> {
  const key = props.bundle.key;
  await sorting.setIgnored({ key, isIgnored: true });
  toasts.show({
    text: t("entitySorting.suggestions.ignoredToast", { name: props.bundle.name }),
    tone: "success",
    undo: () => {
      void sorting.setIgnored({ key, isIgnored: false });
    },
  });
}

/** ↑↓ move between rows, Space ticks, Enter opens the entities. */
function onKey(event: KeyboardEvent): void {
  if (event.target !== event.currentTarget) return;

  const row = event.currentTarget as HTMLElement;
  const rows = [...(row.closest(".kb-list")?.querySelectorAll<HTMLElement>(".kb-row") ?? [])];
  const index = rows.indexOf(row);

  if (event.key === "ArrowDown" || event.key === "ArrowUp") {
    rows[index + (event.key === "ArrowDown" ? 1 : -1)]?.focus();
  } else if (event.key === " ") {
    if (target.value) sorting.tick({ key: props.bundle.key, isOn: !isTicked.value });
  } else if (event.key === "Enter") {
    emit("toggle");
  } else {
    return;
  }
  event.preventDefault();
}
</script>

<style scoped>
.bundle-row {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) auto;
  align-items: start;
  gap: 10px;
  padding: 9px 8px 9px 12px;
  border-top: 1px solid var(--line);
}

.bundle-row:focus-visible {
  outline-offset: -2px;
}

.bundle-row__check {
  width: 17px;
  height: 17px;
  margin: 2px 0 0;
  accent-color: var(--accent);
}

.bundle-row__main {
  display: grid;
  gap: 3px;
  min-width: 0;
}

.bundle-row__line {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 7px;
}

.bundle-row__name {
  font-weight: 600;
}

.bundle-row__count {
  padding: 0 6px;
  border-radius: 6px;
  background: var(--sunken);
  color: var(--muted);
  font-size: 11.5px;
}

.bundle-row__pill,
.bundle-row__change {
  padding: 1px 8px;
  border-radius: 999px;
  font-size: 11.5px;
  font-weight: 700;
  white-space: nowrap;
}

.bundle-row__pill--rule {
  background: var(--accent-soft);
  color: var(--accent);
}

.bundle-row__pill--sure {
  background: var(--ok-soft);
  color: var(--ok);
}

.bundle-row__pill--likely {
  background: var(--warn-soft);
  color: var(--warn);
}

.bundle-row__pill--unclear {
  background: var(--sunken);
  color: var(--muted);
}

.bundle-row__pill--own {
  background: var(--kind-script-soft);
  color: var(--kind-script);
}

.bundle-row__change {
  background: var(--accent);
  color: var(--on-accent);
}

.bundle-row__target {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-weight: 700;
}

.bundle-row__target .mdi {
  color: var(--faint);
}

.bundle-row__tag {
  padding: 0 6px;
  border: 1px solid var(--line-strong);
  border-radius: 5px;
  color: var(--muted);
  font-size: 11px;
  font-weight: 600;
}

.bundle-row__why {
  color: var(--muted);
  font-size: 12.5px;
}

.bundle-row__actions {
  display: flex;
}

.bundle-row__actions .icon-btn {
  width: 30px;
  height: 30px;
  font-size: 17px;
}

.bundle-row__chevron {
  transition: transform 0.15s;
}

.bundle-row--open .bundle-row__chevron {
  transform: rotate(90deg);
}

@keyframes bundle-row-flash {
  from {
    background: var(--accent-soft);
  }

  to {
    background: transparent;
  }
}

.bundle-row--flash {
  animation: bundle-row-flash 1.8s ease-out;
}

@media (prefers-reduced-motion: reduce) {
  .bundle-row--flash {
    animation: none;
    background: var(--accent-soft);
  }
}
</style>
