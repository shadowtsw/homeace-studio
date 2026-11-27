<template>
  <div ref="bar" class="entry-bulk" role="toolbar" :aria-label="t('list.bulk')">
    <b>{{ t("list.checkedCount", { count }) }}</b>
    <button class="btn btn--primary" type="button" @click="emit('move')">
      <span class="mdi mdi-folder-move-outline" />{{ t("list.moveTo") }}
    </button>
    <button class="btn" type="button" @click="emit('setArea')">
      <span class="mdi mdi-map-marker-outline" />{{ t("areas.set.button") }}
    </button>
    <button class="btn" type="button" data-label-toggle @click="bar && emit('label', bar)">
      <span class="mdi mdi-label-outline" />{{ t("labels.add") }}
    </button>
    <button class="btn" type="button" @click="emit('takeOut')">
      {{ t("list.takeOut") }}
    </button>
    <button class="btn entry-bulk__quiet" type="button" @click="emit('checkAll')">
      {{ t("list.checkAll") }}
    </button>
    <button
      class="icon-btn"
      type="button"
      :aria-label="t('list.clearChecked')"
      :title="t('list.clearChecked')"
      @click="emit('clear')"
    >
      <span class="mdi mdi-close" />
    </button>
  </div>
</template>

<script setup lang="ts">
import { useTemplateRef } from "vue";
import { useI18n } from "vue-i18n";

/**
 * The selection bar while entries are ticked: into a folder, an area, labels, out of the folder,
 * all, none.
 */
defineProps<{ count: number }>();

const emit = defineEmits<{
  move: [];
  setArea: [];
  /** "Label": the picker opens next to the bar and never covers it. */
  label: [bar: HTMLElement];
  takeOut: [];
  checkAll: [];
  clear: [];
}>();

const { t } = useI18n();
const bar = useTemplateRef<HTMLElement>("bar");
</script>

<style scoped>
.entry-bulk {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px;
  padding: 8px 8px 8px 12px;
  border-radius: 10px;
  background: var(--accent-soft);
}

.entry-bulk b {
  margin-right: auto;
  color: var(--accent);
  font-size: 13px;
}

.entry-bulk .btn {
  height: 30px;
  padding: 0 10px;
  font-size: 12.5px;
}

.entry-bulk__quiet {
  border-color: transparent;
  background: transparent;
}
</style>
