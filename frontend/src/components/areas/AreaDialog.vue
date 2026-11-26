<template>
  <DialogFrame
    :title="area ? t('areas.dialog.editTitle') : t('areas.dialog.newTitle')"
    @close="emit('cancel')"
    @submit="submit"
  >
    <p class="area-dialog__intro">
      {{ area ? t("areas.dialog.editIntro") : t("areas.dialog.newIntro") }}
    </p>
    <label class="field-label" :for="nameId">{{ t("areas.dialog.name") }}</label>
    <input
      :id="nameId"
      ref="nameInput"
      v-model="name"
      class="field-input"
      :placeholder="t('areas.dialog.placeholder')"
      autocomplete="off"
      :disabled="isBusy"
      @input="guessIcon"
    />
    <p v-if="problem" class="field-problem">{{ problem }}</p>

    <span class="field-label area-dialog__icons-label">{{ t("areas.dialog.icon") }}</span>
    <div class="area-dialog__icons" role="radiogroup" :aria-label="t('areas.dialog.icon')">
      <button
        v-for="option in AREA_ICONS"
        :key="option.icon"
        type="button"
        role="radio"
        :aria-checked="icon === option.icon"
        :class="{ 'area-dialog__icon--on': icon === option.icon }"
        @click="pickIcon(option.icon)"
      >
        <span class="mdi" :class="mdiIconClass(option.icon)" />
        <span>{{ t(`areas.icons.${option.label}`) }}</span>
      </button>
    </div>

    <template #buttons>
      <button class="btn" type="button" :disabled="isBusy" @click="emit('cancel')">
        {{ t("common.cancel") }}
      </button>
      <button class="btn btn--primary" type="submit" :disabled="isBusy || !canSave">
        {{ area ? t("common.save") : t("common.create") }}
      </button>
    </template>
  </DialogFrame>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, useId, useTemplateRef } from "vue";
import { useI18n } from "vue-i18n";

import DialogFrame from "@/components/common/DialogFrame.vue";
import type { Area } from "@/types/entry";
import { AREA_ICONS, DEFAULT_AREA_ICON, guessAreaIcon } from "@/utils/areas/areaIcons";
import { mdiIconClass } from "@/utils/text";

/** Name and icon of a new or existing area. */
const props = defineProps<{
  /** null: a new area. */
  area: Area | null;
  /** Every area, to catch a name that is taken before HA does. */
  areas: readonly Area[];
  isBusy: boolean;
}>();

const emit = defineEmits<{
  cancel: [];
  confirm: [name: string, icon: string | null];
}>();

const { t } = useI18n();
const nameId = useId();
const nameInput = useTemplateRef("nameInput");

const name = ref(props.area?.name ?? "");
const icon = ref(props.area?.icon ?? DEFAULT_AREA_ICON);
/** Once the user picked an icon, typing no longer changes it. */
const isIconPicked = ref(props.area !== null);

onMounted(() => nameInput.value?.focus());

const isTaken = computed(() => {
  const wanted = name.value.trim().toLocaleLowerCase();
  return props.areas.some(
    (area) => area.areaId !== props.area?.areaId && area.name.toLocaleLowerCase() === wanted,
  );
});
const problem = computed(() =>
  isTaken.value ? t("areas.dialog.taken", { name: name.value.trim() }) : "",
);
const canSave = computed(() => name.value.trim() !== "" && !isTaken.value);

function guessIcon(): void {
  if (!isIconPicked.value) icon.value = guessAreaIcon(name.value);
}

function pickIcon(value: string): void {
  icon.value = value;
  isIconPicked.value = true;
}

function submit(): void {
  if (canSave.value && !props.isBusy) emit("confirm", name.value.trim(), icon.value);
}
</script>

<style scoped>
.area-dialog__intro {
  margin: 0 0 12px;
  color: var(--muted);
}

.area-dialog__icons-label {
  display: block;
  margin-top: 14px;
}

.area-dialog__icons {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(76px, 1fr));
  gap: 6px;
}

.area-dialog__icons button {
  display: grid;
  place-items: center;
  gap: 3px;
  padding: 8px 4px;
  border: 1px solid var(--line);
  border-radius: 10px;
  background: var(--surface);
  color: var(--muted);
  cursor: pointer;
  font: inherit;
  font-size: 11.5px;
}

.area-dialog__icons button .mdi {
  font-size: 20px;
}

.area-dialog__icons button:hover {
  border-color: var(--line-strong);
}

.area-dialog__icons .area-dialog__icon--on {
  border-color: var(--accent);
  background: var(--accent-soft);
  color: var(--fg);
  box-shadow: inset 0 0 0 1px var(--accent);
}
</style>
