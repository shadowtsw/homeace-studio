<template>
  <form class="label-edit" @submit.prevent="save">
    <label class="label-edit__field">
      <span>{{ t("labels.name") }}</span>
      <input v-model="name" class="field-input" autocomplete="off" :disabled="isBusy" />
    </label>
    <p v-if="problem" class="label-edit__problem" role="alert">{{ problem }}</p>

    <div class="label-edit__field">
      <span>{{ t("labels.color") }}</span>
      <div class="label-edit__swatches">
        <button
          type="button"
          class="label-edit__swatch label-edit__swatch--none"
          :class="{ 'label-edit__swatch--on': color === null }"
          :title="t('labels.noColor')"
          :aria-label="t('labels.noColor')"
          @click="color = null"
        >
          <span class="mdi mdi-cancel" />
        </button>
        <button
          v-for="item in LABEL_COLORS"
          :key="item.name"
          type="button"
          class="label-edit__swatch"
          :class="{ 'label-edit__swatch--on': color === item.name }"
          :style="{ background: item.css }"
          :title="item.name"
          :aria-label="item.name"
          @click="color = item.name"
        />
      </div>
    </div>

    <div class="label-edit__field">
      <span>{{ t("labels.icon") }}</span>
      <IconField
        v-model="icon"
        fallback="mdi-label-outline"
        :label="t('labels.icon')"
        :is-disabled="isBusy"
        is-compact
      />
    </div>

    <div class="label-edit__preview">
      {{ t("labels.preview") }}
      <LabelChip :label="{ name: name.trim() || label.name, icon: iconValue, color }" />
    </div>
    <p class="label-edit__note">{{ t("labels.usedBy", { count: entryCount }) }}</p>

    <div class="label-edit__buttons">
      <button
        type="button"
        class="btn label-edit__delete"
        :disabled="isBusy"
        @click="emit('delete')"
      >
        <span class="mdi mdi-delete-outline" />{{ t("labels.delete") }}
      </button>
      <span class="label-edit__space" />
      <button type="button" class="btn" :disabled="isBusy" @click="emit('back')">
        {{ t("labels.back") }}
      </button>
      <button type="submit" class="btn btn--primary" :disabled="isBusy">
        {{ t("labels.save") }}
      </button>
    </div>
  </form>
</template>

<script setup lang="ts">
import { computed, ref } from "vue";
import { useI18n } from "vue-i18n";

import IconField from "@/components/icons/IconField.vue";
import type { LabelFields } from "@/services/labelsService";
import type { Label } from "@/types/entry";
import { LABEL_COLORS } from "@/utils/labelColors";

import LabelChip from "./LabelChip.vue";

const props = defineProps<{
  label: Label;
  /** Every label, to refuse a name that exists (HA ignores case). */
  labels: Label[];
  /** How many entries carry it. */
  entryCount: number;
  isBusy: boolean;
}>();

const emit = defineEmits<{ save: [fields: LabelFields]; delete: []; back: [] }>();

const { t } = useI18n();

const name = ref(props.label.name);
const color = ref<string | null>(props.label.color);
const icon = ref(props.label.icon ?? "");
const iconValue = computed(() => icon.value.trim() || null);

/** Checked here first, so the user sees it at once; the backend checks again. */
const problem = ref<string | null>(null);

function save(): void {
  const trimmed = name.value.trim();
  const lower = trimmed.toLocaleLowerCase();
  const isTaken = props.labels.some(
    (item) => item.labelId !== props.label.labelId && item.name.toLocaleLowerCase() === lower,
  );

  const isUnchanged =
    trimmed === props.label.name &&
    color.value === props.label.color &&
    iconValue.value === props.label.icon;

  if (!trimmed) problem.value = t("labels.nameEmpty");
  else if (isTaken) problem.value = t("labels.nameTaken", { name: trimmed });
  // Nothing to send: "Speichern" then just leads back, like after a save
  else if (isUnchanged) emit("back");
  else emit("save", { name: trimmed, color: color.value, icon: iconValue.value });
}
</script>

<style scoped>
.label-edit {
  display: grid;
  gap: 12px;
  padding: 4px 8px 8px;
}

.label-edit__field {
  display: grid;
  gap: 5px;
}

.label-edit__field > span:first-child {
  color: var(--muted);
  font-size: 12px;
  font-weight: 600;
}

.label-edit__problem {
  margin: -6px 0 0;
  color: var(--err);
  font-size: 12px;
}

.label-edit__swatches {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.label-edit__swatch {
  display: grid;
  place-items: center;
  width: 22px;
  height: 22px;
  padding: 0;
  border: 0;
  border-radius: 50%;
  cursor: pointer;
}

.label-edit__swatch--none {
  background: var(--sunken);
  color: var(--muted);
}

.label-edit__swatch--on {
  box-shadow:
    0 0 0 2px var(--surface),
    0 0 0 4px var(--fg);
}

.label-edit__preview {
  display: flex;
  align-items: center;
  gap: 8px;
  color: var(--muted);
  font-size: 12px;
}

.label-edit__note {
  margin: 0;
  color: var(--muted);
  font-size: 12px;
  line-height: 1.45;
}

.label-edit__buttons {
  display: flex;
  align-items: center;
  gap: 6px;
  padding-top: 8px;
  border-top: 1px solid var(--line);
}

.label-edit__space {
  flex: 1;
}

.label-edit__delete {
  border-color: transparent;
  background: transparent;
  color: var(--err);
}
</style>
