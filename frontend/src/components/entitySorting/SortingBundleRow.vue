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
      @change="sorting.tick(bundle.key, ($event.target as HTMLInputElement).checked)"
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
      <div class="bundle-row__alternatives">
        <template v-if="alternatives.length">
          <span>{{ t("entitySorting.suggestions.rather") }}</span>
          <button
            v-for="path in alternatives"
            :key="path"
            class="bundle-row__chip"
            type="button"
            @click="sorting.pick(bundle.key, path)"
          >
            {{ path }}
          </button>
        </template>
        <template v-if="isNaming">
          <input
            ref="nameInput"
            v-model="newName"
            class="field-input bundle-row__pick"
            :placeholder="t('entitySorting.suggestions.newFolderPlaceholder')"
            :aria-label="t('entitySorting.suggestions.newFolder')"
            @keydown.enter.prevent.stop="takeNewName"
            @keydown.escape.stop="isNaming = false"
          />
          <button class="btn btn--sm" type="button" @click="takeNewName">
            {{ t("entitySorting.suggestions.take") }}
          </button>
          <button class="btn btn--sm" type="button" @click="isNaming = false">
            {{ t("entitySorting.rules.cancel") }}
          </button>
        </template>
        <select
          v-else
          class="field-input bundle-row__pick"
          :aria-label="t('entitySorting.suggestions.chooseFolder')"
          @change="onPick"
        >
          <option value="">
            {{
              target
                ? t("entitySorting.suggestions.otherFolder")
                : t("entitySorting.suggestions.chooseFolder")
            }}
          </option>
          <option v-for="path in folderOptions" :key="path" :value="path">{{ path }}</option>
          <option :value="NEW_FOLDER">{{ t("entitySorting.suggestions.newFolder") }}</option>
        </select>
      </div>
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
  <div v-if="isOpen" class="bundle-row__entities">
    <label
      v-for="entity in bundle.entities"
      :key="entity.entityId"
      class="bundle-row__entity"
      :class="{ 'bundle-row__entity--out': sorting.excluded.has(entity.entityId) }"
    >
      <input
        type="checkbox"
        :checked="!sorting.excluded.has(entity.entityId)"
        @change="sorting.toggleExcluded(entity.entityId)"
      />
      {{ entity.name }}
      <code v-if="settings.isTechnicalDetailsVisible" class="bundle-row__id">{{
        entity.entityId
      }}</code>
      <span v-if="entity === bundle.main && bundle.entities.length > 1" class="bundle-row__tag">
        {{ t("entitySorting.suggestions.main") }}
      </span>
      <span v-if="entity.entityCategory" class="bundle-row__tag">{{
        t("entitySorting.suggestions.technical")
      }}</span>
      <span
        v-if="ownTargetOf(entity) && !sorting.excluded.has(entity.entityId)"
        class="bundle-row__own"
      >
        → {{ ownTargetOf(entity) }}
      </span>
    </label>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, ref, useTemplateRef } from "vue";
import { useI18n } from "vue-i18n";

import { useSortingTexts } from "@/composables/useSortingTexts";
import { useEntitySortingStore } from "@/stores/entitySortingStore";
import { useSettingsStore } from "@/stores/settingsStore";
import { useToastStore } from "@/stores/toastStore";
import type { SortingEntity } from "@/types/entitySorting";
import { entityTarget, targetOf } from "@/utils/entitySorting/compute";
import type { SortingBundle, SortingGroup } from "@/utils/entitySorting/model";
import { hasNewTarget } from "@/utils/entitySorting/targets";

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

const NEW_FOLDER = "\u0000new";

const { t } = useI18n();
const sorting = useEntitySortingStore();
const settings = useSettingsStore();
const toasts = useToastStore();
const texts = useSortingTexts();
const isNaming = ref(false);
const newName = ref("");
const nameInput = useTemplateRef("nameInput");

const suggestion = computed(
  () =>
    sorting.computation?.suggestions.get(props.bundle.key) ?? {
      target: null,
      confidence: "unclear" as const,
      reasons: [],
      hintKinds: [],
      alternatives: [],
      isNew: false,
      isUsedEverywhere: false,
      ruleNumber: null,
    },
);
const choice = computed(() => sorting.choices.get(props.bundle.key));
const target = computed(() =>
  targetOf(props.bundle, {
    state: sorting.state(),
    previous: sorting.computation,
    layout: sorting.layout,
  }),
);
const isTicked = computed(() => !!choice.value?.isOn && !!target.value);
const change = computed(() => sorting.changes.get(props.bundle.key));
const isFlashing = computed(() => sorting.flashing.has(props.bundle.key));
/** The group says the folder already; only show it when this row goes elsewhere. */
const isTargetShown = computed(
  () =>
    props.group.type === "system" ||
    props.group.type === "rest" ||
    !!choice.value?.target ||
    hasNewTarget(suggestion.value, props.group),
);
const canReject = computed(
  () =>
    !!target.value &&
    !choice.value?.target &&
    suggestion.value.confidence !== "rule" &&
    props.group.type !== "system",
);
const alternatives = computed(() => {
  const weak =
    suggestion.value.confidence === "unclear" && suggestion.value.target
      ? [suggestion.value.target]
      : [];

  return [...new Set([...weak, ...suggestion.value.alternatives])].filter(
    (path) => path !== target.value,
  );
});
const meta = computed(() => {
  const area = props.bundle.areaId ? sorting.home?.areas.get(props.bundle.areaId)?.name : null;
  const integration = props.bundle.integration
    ? (sorting.home?.context.integrations[props.bundle.integration] ?? props.bundle.integration)
    : null;

  return [area, integration].filter(Boolean).join(" · ");
});
const why = computed(() => {
  if (choice.value?.target) return t("entitySorting.suggestions.ownPick");
  if (!suggestion.value.reasons.length && props.group.type === "rest")
    return t("entitySorting.suggestions.nothingFits");

  return suggestion.value.reasons.map(texts.reason).join(" · ");
});

function ownTargetOf(entity: SortingEntity): string | null {
  return sorting.home
    ? (entityTarget(entity, props.bundle, { home: sorting.home, state: sorting.state() })?.target ??
        null)
    : null;
}

async function onPick(event: Event): Promise<void> {
  const select = event.target as HTMLSelectElement;
  const value = select.value;
  select.value = "";

  if (value === NEW_FOLDER) {
    isNaming.value = true;
    await nextTick();
    nameInput.value?.focus();
  } else if (value) {
    sorting.pick(props.bundle.key, value);
  }
}

function takeNewName(): void {
  const path = newName.value
    .split("/")
    .map((level) => level.trim())
    .filter(Boolean)
    .join("/");
  if (!path) return;

  sorting.pick(props.bundle.key, path);
  isNaming.value = false;
  newName.value = "";
}

async function reject(): Promise<void> {
  const path = target.value;
  if (!path) return;

  await sorting.reject(props.bundle.key, path);
  toasts.show(t("entitySorting.suggestions.rejectedToast", { path, name: props.bundle.name }));
}

async function ignore(): Promise<void> {
  const key = props.bundle.key;
  await sorting.setIgnored(key, true);
  toasts.show(
    t("entitySorting.suggestions.ignoredToast", { name: props.bundle.name }),
    "success",
    () => {
      void sorting.setIgnored(key, false);
    },
  );
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
    if (target.value) sorting.tick(props.bundle.key, !isTicked.value);
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

.bundle-row__alternatives {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px;
  margin-top: 2px;
  color: var(--faint);
  font-size: 12.5px;
}

.bundle-row__chip {
  padding: 1px 9px;
  border: 1px dashed var(--line-strong);
  border-radius: 999px;
  background: transparent;
  color: var(--fg);
  cursor: pointer;
  font-size: 12px;
}

.bundle-row__chip:hover {
  border-color: var(--accent);
  border-style: solid;
  color: var(--accent);
}

.bundle-row__pick {
  width: auto;
  max-width: 220px;
  height: 26px;
  padding: 0 6px;
  font-size: 12px;
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

.bundle-row__entities {
  display: grid;
  gap: 2px;
  padding: 4px 12px 10px 39px;
  background: var(--surface-2);
}

.bundle-row__entity {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
  padding: 3px 0;
  font-size: 13px;
}

.bundle-row__entity--out {
  color: var(--faint);
  text-decoration: line-through;
}

.bundle-row__id {
  color: var(--faint);
  font-family: var(--font-mono);
  font-size: 11.5px;
}

.bundle-row__own {
  color: var(--accent);
  font-size: 12px;
  font-weight: 600;
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
