<template>
  <span ref="field" class="icon-field">
    <AppIcon class="icon-field__preview" :icon="model" :fallback="fallback" />
    <input
      v-model="model"
      class="field-input"
      placeholder="mdi:lightbulb"
      autocomplete="off"
      :aria-label="label"
      :disabled="isDisabled"
    />
    <button
      type="button"
      class="btn icon-field__pick"
      :class="{ 'icon-field__pick--compact': isCompact }"
      :title="t('icons.choose')"
      :aria-label="t('icons.choose')"
      :aria-expanded="isOpen"
      data-icon-toggle
      :disabled="isDisabled"
      @click="isOpen = !isOpen"
    >
      <span class="mdi mdi-view-grid-outline" />
      <span v-if="!isCompact">{{ t("icons.choose") }}</span>
    </button>
  </span>
  <small v-if="note" class="icon-field__note">{{ note }}</small>
  <IconPicker
    v-if="isOpen && field"
    :field="field"
    :value="model"
    @pick="pick"
    @close="isOpen = false"
  />
</template>

<script setup lang="ts">
import { computed, onMounted, ref, useTemplateRef } from "vue";
import { useI18n } from "vue-i18n";

import AppIcon from "@/components/common/AppIcon.vue";
import { useIconPacksStore } from "@/stores/iconPacksStore";
import { MDI_PACK, parseHaIcon } from "@/utils/haIcon";

import IconPicker from "./IconPicker.vue";

/** An icon field: preview, text input (typing still works) and the icon search. */
const model = defineModel<string>({ required: true });

defineProps<{
  /** Shown in the preview while the field is empty or the icon cannot be shown. */
  fallback: string;
  /** For screen readers, as the field has no label of its own. */
  label: string;
  isDisabled?: boolean;
  /** Only the grid symbol on the button, for narrow forms (the label editor). */
  isCompact?: boolean;
}>();

const { t } = useI18n();
const packs = useIconPacksStore();
const field = useTemplateRef("field");
const isOpen = ref(false);

/** Why the preview shows the fallback; nothing for an empty field or an icon that shows. */
const note = computed((): string | null => {
  const icon = model.value.trim();
  if (!icon) return null;

  const parsed = parseHaIcon(icon);
  if (!parsed) return t("icons.malformed", { icon });
  if (parsed.pack === MDI_PACK)
    return packs.hasStandardIcon(parsed.name) ? null : t("icons.unknown", { icon });
  if (packs.isReady && !packs.packs.includes(parsed.pack))
    return t("icons.packMissing", { icon, pack: parsed.pack });

  return packs.paths[icon] === null ? t("icons.unknown", { icon }) : null;
});

function pick(icon: string): void {
  model.value = icon;
  isOpen.value = false;
}

// Knowing the packs early lets the note say at once when one is missing
onMounted(() => void packs.load());
</script>

<style scoped>
.icon-field {
  display: flex;
  align-items: center;
  gap: 8px;
}

.icon-field .field-input {
  flex: 1;
  min-width: 0;
}

.icon-field__preview {
  flex: none;
  color: var(--muted);
  font-size: 20px;
}

.icon-field__pick {
  flex: none;
  white-space: nowrap;
}

.icon-field__pick--compact {
  padding-inline: 8px;
}

.icon-field__note {
  display: block;
  margin-top: 4px;
  color: var(--muted);
  font-size: 12px;
  line-height: 1.4;
}
</style>
