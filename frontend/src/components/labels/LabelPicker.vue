<template>
  <div
    ref="panel"
    class="label-picker"
    role="dialog"
    :aria-label="t('labels.title')"
    :style="style"
  >
    <LabelEditForm
      v-if="editing"
      :key="editing.labelId"
      :label="editing"
      :labels="labels"
      :entry-count="counts[editing.labelId] ?? 0"
      :is-busy="isBusy"
      @save="(fields) => emit('update', editing!.labelId, fields)"
      @delete="emit('delete', editing!)"
      @back="editing = null"
    />

    <template v-else>
      <div class="label-picker__title">{{ t("labels.title") }}</div>
      <input
        ref="search"
        v-model="query"
        class="field-input label-picker__search"
        :placeholder="t('labels.search')"
        autocomplete="off"
        @keydown.enter.prevent="onEnter"
      />
      <div class="label-picker__list">
        <div v-for="label in shown" :key="label.labelId" class="label-picker__row">
          <button type="button" class="label-picker__pick" @click="emit('toggle', label.labelId)">
            <span class="mdi label-picker__check" :class="checkIcon(label.labelId)" />
            <LabelChip :label="label" />
            <small>{{ counts[label.labelId] ?? 0 }}</small>
          </button>
          <button
            type="button"
            class="icon-btn label-picker__edit"
            :title="t('labels.edit', { name: label.name })"
            :aria-label="t('labels.edit', { name: label.name })"
            @click="editing = label"
          >
            <span class="mdi mdi-pencil-outline" />
          </button>
        </div>
        <p v-if="labels.length === 0 && !query.trim()" class="label-picker__empty">
          {{ t("labels.emptyList") }}
        </p>
        <button v-if="canCreate" type="button" class="label-picker__create" @click="create">
          <span class="mdi mdi-plus" />
          <span>
            {{ t("labels.create", { name: query.trim() }) }}
            <small>{{ t("labels.createSub") }}</small>
          </span>
        </button>
      </div>
      <p class="label-picker__foot">
        <span class="mdi mdi-information-outline" />{{ t("labels.footer") }}
      </p>
    </template>
  </div>
</template>

<script setup lang="ts">
import { onClickOutside, onKeyStroke, useEventListener } from "@vueuse/core";
import { computed, nextTick, onMounted, ref, toRef, useTemplateRef, watch } from "vue";
import { useI18n } from "vue-i18n";

import { useNoCoverPlacement } from "@/composables/useNoCoverPlacement";
import type { LabelFields } from "@/services/labelsService";
import type { Label } from "@/types/entry";

import LabelChip from "./LabelChip.vue";
import LabelEditForm from "./LabelEditForm.vue";

const props = defineProps<{
  /** The label field it belongs to: the picker opens next to it and never covers it. */
  field: HTMLElement;
  labels: Label[];
  /** Ticked labels; `partialIds` are on some of several entries (Mehrfachauswahl). */
  checkedIds: readonly string[];
  partialIds?: readonly string[];
  /** How many entries carry each label. */
  counts: Record<string, number>;
  isBusy: boolean;
}>();

const emit = defineEmits<{
  toggle: [labelId: string];
  create: [name: string];
  update: [labelId: string, fields: LabelFields];
  delete: [label: Label];
  close: [];
}>();

const { t } = useI18n();
const query = ref("");
const editing = ref<Label | null>(null);
const panel = useTemplateRef("panel");
const search = useTemplateRef("search");
const placement = useNoCoverPlacement(toRef(props, "field"), panel);
const style = placement.style;

const shown = computed(() => {
  const needle = query.value.trim().toLocaleLowerCase();
  return props.labels.filter((label) => label.name.toLocaleLowerCase().includes(needle));
});
const exact = computed(() => {
  const needle = query.value.trim().toLocaleLowerCase();
  return props.labels.find((label) => label.name.toLocaleLowerCase() === needle) ?? null;
});
const canCreate = computed(() => query.value.trim() !== "" && exact.value === null);

function checkIcon(labelId: string): string {
  if (props.checkedIds.includes(labelId)) return "mdi-checkbox-marked label-picker__check--on";
  if (props.partialIds?.includes(labelId)) return "mdi-minus-box label-picker__check--on";
  return "mdi-checkbox-blank-outline";
}

/** Enter: the label with exactly this name is ticked, otherwise a new one is made. */
function onEnter(): void {
  if (exact.value) emit("toggle", exact.value.labelId);
  else if (canCreate.value) create();
}

function create(): void {
  emit("create", query.value.trim());
  query.value = "";
}

// Ticking adds chips to the field; after each change the picker checks it still does not cover them
watch(
  () => [props.checkedIds, props.partialIds, props.labels, editing.value],
  () => void nextTick(placement.place),
  { deep: true },
);
// Saved (the label changed in HA) or deleted (it is gone): back to the list, as in the dummy.
// A failed save changes nothing, so the form stays with its input.
watch(
  () => props.labels,
  (labels) => {
    const open = editing.value;
    if (!open) return;
    const fresh = labels.find((label) => label.labelId === open.labelId);
    const isChanged =
      !fresh || fresh.name !== open.name || fresh.color !== open.color || fresh.icon !== open.icon;
    if (isChanged) editing.value = null;
  },
);
onMounted(async () => {
  await nextTick();
  placement.place();
  search.value?.focus();
});

// The field itself (its "+ Label" button toggles the picker) does not count as outside
const fieldRef = computed(() => props.field);
onClickOutside(panel, () => emit("close"), { ignore: [fieldRef] });
onKeyStroke("Escape", () => (editing.value ? (editing.value = null) : emit("close")));
useEventListener(window, "resize", () => emit("close"));
// Fixed in the window: when the user scrolls the page away, it closes (not when we scroll ourselves)
useEventListener(
  document,
  "scroll",
  (event: Event) => {
    if (!panel.value?.contains(event.target as Node) && !placement.isOwnScroll()) emit("close");
  },
  { capture: true, passive: true },
);
</script>

<style scoped>
.label-picker {
  position: fixed;
  z-index: 120;
  display: flex;
  flex-direction: column;
  width: min(340px, calc(100vw - 24px));
  max-height: min(460px, 80vh);
  padding: 8px;
  border: 1px solid var(--line-strong);
  border-radius: 12px;
  background: var(--surface);
  box-shadow: var(--shadow);
}

.label-picker__title {
  padding: 4px 6px 8px;
  color: var(--faint);
  font-size: 11.5px;
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
}

.label-picker__search {
  margin-bottom: 6px;
}

.label-picker__list {
  flex: 1;
  min-height: 0;
  overflow: auto;
}

.label-picker__row {
  display: flex;
  align-items: center;
  border-radius: 8px;
}

.label-picker__row:hover {
  background: var(--sunken);
}

.label-picker__pick {
  display: flex;
  flex: 1;
  align-items: center;
  gap: 8px;
  min-width: 0;
  padding: 6px 8px;
  border: 0;
  background: none;
  color: var(--fg);
  font: inherit;
  text-align: left;
  cursor: pointer;
}

.label-picker__pick small {
  margin-left: auto;
  color: var(--faint);
  font-size: 11.5px;
  font-variant-numeric: tabular-nums;
}

.label-picker__check {
  color: var(--faint);
  font-size: 18px;
}

.label-picker__check--on {
  color: var(--accent);
}

/* The pencil shows on hover; on touch it is always there. */
.label-picker__edit {
  margin-right: 2px;
  opacity: 0;
}

.label-picker__row:hover .label-picker__edit,
.label-picker__edit:focus-visible {
  opacity: 1;
}

@media (hover: none) {
  .label-picker__edit {
    opacity: 1;
  }
}

.label-picker__create {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  width: 100%;
  margin-top: 4px;
  padding: 8px;
  border: 0;
  border-top: 1px solid var(--line);
  background: none;
  color: var(--fg);
  font: inherit;
  text-align: left;
  cursor: pointer;
}

.label-picker__create:hover {
  background: var(--sunken);
}

.label-picker__create small {
  display: block;
  color: var(--muted);
  font-size: 11.5px;
}

.label-picker__empty {
  margin: 10px 8px;
  color: var(--muted);
  font-size: 13px;
}

.label-picker__foot {
  display: flex;
  align-items: center;
  gap: 6px;
  margin: 6px 0 0;
  padding: 8px 6px 2px;
  border-top: 1px solid var(--line);
  color: var(--faint);
  font-size: 11.5px;
}
</style>
