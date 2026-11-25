<template>
  <span class="label-chip" :style="{ '--label-color': color }">
    <span v-if="iconClass" class="mdi label-chip__icon" :class="iconClass" />
    <span v-else class="label-chip__dot" />
    <span class="label-chip__name">{{ label.name }}</span>
    <button
      v-if="isRemovable"
      type="button"
      class="label-chip__remove"
      :aria-label="t('labels.remove', { name: label.name })"
      :title="t('labels.remove', { name: label.name })"
      :disabled="isDisabled"
      @click="emit('remove')"
    >
      <span class="mdi mdi-close" />
    </button>
  </span>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { useI18n } from "vue-i18n";

import type { Label } from "@/types/entry";
import { labelColorCss } from "@/utils/labelColors";
import { mdiIconClass } from "@/utils/text";

const props = defineProps<{
  label: Pick<Label, "name" | "icon" | "color">;
  isRemovable?: boolean;
  isDisabled?: boolean;
}>();

const emit = defineEmits<{ remove: [] }>();

const { t } = useI18n();

/** A label without a colour stays quiet grey, like in HA. */
const color = computed(() => labelColorCss(props.label.color) ?? "var(--line-strong)");
const iconClass = computed(() => mdiIconClass(props.label.icon));
</script>

<style scoped>
/* The label's own colour, softened, so many labels do not shout. */
.label-chip {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  max-width: 100%;
  padding: 2px 8px;
  border-radius: 999px;
  background: color-mix(in srgb, var(--label-color) 18%, var(--sunken));
  color: var(--fg);
  font-size: 12.5px;
  font-weight: 500;
  line-height: 1.5;
  white-space: nowrap;
}

.label-chip__icon {
  color: var(--label-color);
  font-size: 14px;
}

.label-chip__dot {
  flex: none;
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: var(--label-color);
}

.label-chip__name {
  overflow: hidden;
  text-overflow: ellipsis;
}

.label-chip__remove {
  display: grid;
  place-items: center;
  width: 18px;
  height: 18px;
  margin-right: -4px;
  padding: 0;
  border: 0;
  border-radius: 50%;
  background: none;
  color: var(--muted);
  cursor: pointer;
}

.label-chip__remove:hover {
  background: var(--line);
  color: var(--fg);
}
</style>
