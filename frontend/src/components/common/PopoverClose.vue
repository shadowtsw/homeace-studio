<template>
  <button
    class="icon-btn popover-close"
    type="button"
    :aria-label="t('common.close')"
    :title="t('common.close')"
    @click="emit('close')"
  >
    <span class="mdi mdi-close" />
  </button>
</template>

<script setup lang="ts">
import { useI18n } from "vue-i18n";

/**
 * The small X in the title line of a panel. Every panel closes by a click outside, Escape and
 * something visible: with little free space around it, clicking outside is no real way.
 */
const emit = defineEmits<{ close: [] }>();

const { t } = useI18n();
</script>

<style scoped>
.popover-close {
  flex: none;
  width: 28px;
  height: 28px;
  margin: -4px -4px -4px auto;
  font-size: 18px;
}

@media (pointer: coarse) {
  .popover-close {
    width: 36px;
    height: 36px;
  }
}
</style>
