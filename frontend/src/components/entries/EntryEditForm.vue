<template>
  <form class="entry-edit" @submit.prevent="save">
    <div class="entry-edit__grid">
      <label class="entry-edit__field">
        <span class="field-label">{{ t("detail.name") }}</span>
        <input v-model="name" class="field-input" autocomplete="off" :disabled="isBusy" />
      </label>
      <div class="entry-edit__field">
        <span class="field-label">{{ t("detail.icon") }}</span>
        <IconField
          v-model="icon"
          :fallback="fallbackIcon"
          :label="t('detail.icon')"
          :is-disabled="isBusy"
        />
      </div>
      <label class="entry-edit__field">
        <span class="field-label">{{ t("detail.area") }}</span>
        <select v-model="areaId" class="field-input" :disabled="isBusy">
          <option :value="null">{{ t("detail.noArea") }}</option>
          <option v-for="area in areas" :key="area.areaId" :value="area.areaId">
            {{ area.name }}
          </option>
          <option :value="NEW_AREA">{{ t("areas.newAreaOption") }}</option>
        </select>
      </label>
    </div>

    <div class="entry-edit__field">
      <span class="field-label">{{ t("detail.labels") }}</span>
      <!-- The given labels as chips; "+ Label" opens the picker, which never covers them. -->
      <div ref="labelField" class="entry-edit__labels">
        <LabelChip
          v-for="label in pickedLabels"
          :key="label.labelId"
          :label="label"
          is-removable
          :is-disabled="isBusy"
          @remove="toggleLabel(label.labelId)"
        />
        <button
          class="btn btn--small"
          type="button"
          :disabled="isBusy"
          :aria-expanded="isPickerOpen"
          data-label-toggle
          @click="isPickerOpen = !isPickerOpen"
        >
          <span class="mdi mdi-plus" />{{ t("labels.add") }}
        </button>
      </div>
      <LabelPicker
        v-if="isPickerOpen && labelField"
        :field="labelField"
        :labels="labels"
        :checked-ids="labelIds"
        :counts="labelActions.counts.value"
        :is-busy="labelActions.isBusy.value"
        @toggle="toggleLabel"
        @create="createLabel"
        @update="(labelId, fields) => void labelActions.update(labelId, fields)"
        @delete="deleteLabel"
        @close="isPickerOpen = false"
      />
    </div>

    <div class="entry-edit__buttons">
      <span class="entry-edit__hint">{{ t("detail.nameHint") }}</span>
      <button class="btn" type="button" :disabled="isBusy || !isDirty" @click="reset">
        {{ t("common.reset") }}
      </button>
      <button class="btn btn--primary" type="submit" :disabled="isBusy || !isDirty">
        {{ t("common.save") }}
      </button>
    </div>
  </form>
</template>

<script setup lang="ts">
import { computed, ref, useTemplateRef, watch } from "vue";
import { useI18n } from "vue-i18n";

import IconField from "@/components/iconpicker/IconField.vue";
import LabelChip from "@/components/labels/LabelChip.vue";
import LabelPicker from "@/components/labels/LabelPicker.vue";
import { useLabelActions } from "@/composables/useLabelActions";
import { useAreasStore } from "@/stores/areasStore";
import type { Area, Entry, EntryChanges, Label } from "@/types/entry";
import {
  entryFormChanges,
  entryFormValuesOf,
  isFormEdited,
  type EntryFormValues,
} from "@/utils/entryForm";

const props = defineProps<{
  entry: Entry;
  areas: Area[];
  labels: Label[];
  /** Shown in the preview while the icon field is empty or not an mdi icon. */
  fallbackIcon: string;
  isBusy: boolean;
}>();

const emit = defineEmits<{
  save: [changes: EntryChanges];
}>();

const { t } = useI18n();

const name = ref("");
const icon = ref("");
const areaId = ref<string | null>(null);
const labelIds = ref<string[]>([]);

/**
 * What the form was filled from. "Changed" always means changed against this, never against HA
 * now, so saving cannot undo something that changed elsewhere while the form was open.
 */
const base = ref<EntryFormValues>(entryFormValuesOf(props.entry));

const formValues = (): EntryFormValues => ({
  name: name.value,
  icon: icon.value,
  areaId: areaId.value,
  labelIds: labelIds.value,
});

/** Fills the form from the entry; runs when another entry opens or after saving. */
function reset(): void {
  base.value = entryFormValuesOf(props.entry);
  name.value = base.value.name;
  icon.value = base.value.icon;
  areaId.value = base.value.areaId;
  labelIds.value = [...base.value.labelIds];
}

/** Set by save(): the next entry from HA is the saved one, so the form takes it over. */
let isSaving = false;

// Live updates and changes from elsewhere (renaming in the list) bring a new entry object. The form
// takes it over unless the user is editing it.
watch(
  () => props.entry,
  (next, previous) => {
    if (
      !previous ||
      next.entityId !== previous.entityId ||
      isSaving ||
      !isFormEdited(formValues(), base.value)
    ) {
      reset();
    }
    isSaving = false;
  },
  { immediate: true },
);

// ---- labels: given ones as chips, the picker for the rest ----------------------------------

const labelActions = useLabelActions();
const labelField = useTemplateRef<HTMLElement>("labelField");
const isPickerOpen = ref(false);

/** The ticked labels with name, colour and icon; one HA no longer knows keeps the entry's name. */
const pickedLabels = computed(() =>
  labelIds.value.map(
    (labelId) =>
      props.labels.find((label) => label.labelId === labelId) ?? {
        labelId,
        name: props.entry.labels.find((label) => label.labelId === labelId)?.name ?? labelId,
        icon: null,
        color: null,
      },
  ),
);

/** A new label is made in HA right away and ticked here; "Speichern" gives it to the entry. */
async function createLabel(name: string): Promise<void> {
  const label = await labelActions.create(name);
  if (label && !labelIds.value.includes(label.labelId))
    labelIds.value = [...labelIds.value, label.labelId];
}

function deleteLabel(label: Label): void {
  isPickerOpen.value = false;
  void labelActions.startDelete(label);
}

// Another entry: the picker belongs to the old one
watch(
  () => props.entry.entityId,
  () => (isPickerOpen.value = false),
);

/** Value of the "+ Neuer Bereich …" option; never saved. */
const NEW_AREA = "__new_area__";
const areasStore = useAreasStore();

// Picking "+ Neuer Bereich …" opens the area dialog and selects the new area afterwards.
watch(areaId, (next, previous) => {
  if (next !== NEW_AREA) return;
  areaId.value = previous;
  areasStore.startCreate((area) => (areaId.value = area.areaId));
});

const isDirty = computed(() => isFormEdited(formValues(), base.value));

function toggleLabel(labelId: string): void {
  labelIds.value = labelIds.value.includes(labelId)
    ? labelIds.value.filter((id) => id !== labelId)
    : [...labelIds.value, labelId];
}

/**
 * Sends only what the user changed since the form was filled, so a save never undoes a change made
 * elsewhere meanwhile; ticked and unticked labels are applied to the labels the entry has now.
 */
function save(): void {
  isSaving = true;
  emit(
    "save",
    entryFormChanges({
      form: formValues(),
      base: base.value,
      currentLabelIds: props.entry.labels.map((label) => label.labelId),
    }),
  );
}
</script>

<style scoped>
.entry-edit {
  display: grid;
  gap: 14px;
  padding: 16px;
  border: 1px solid var(--line);
  border-radius: 12px;
  background: var(--surface);
}

.entry-edit__grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12px;
}

.entry-edit__field {
  display: grid;
  gap: 5px;
}

.entry-edit__labels {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px;
}

.entry-edit__buttons {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: flex-end;
  gap: 8px;
}

.entry-edit__buttons .entry-edit__hint {
  flex: 1;
}

.entry-edit__hint {
  color: var(--faint);
  font-size: 12.5px;
}

@media (max-width: 1000px) {
  .entry-edit__grid {
    grid-template-columns: minmax(0, 1fr);
  }
}
</style>
