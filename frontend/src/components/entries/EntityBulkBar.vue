<template>
  <div class="entity-bulk" role="toolbar" :aria-label="t('list.bulk')">
    <b>{{ t("list.checkedEntities", { count }, count) }}</b>
    <button class="btn btn--primary" type="button" @click="emit('move')">
      <span class="mdi mdi-folder-move-outline" />{{ t("list.moveTo") }}
    </button>
    <button class="btn" type="button" @click="emit('takeOut')">
      {{ t("list.takeOut") }}
    </button>
    <button class="btn entity-bulk__quiet" type="button" @click="emit('checkAll')">
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
import { useI18n } from "vue-i18n";

/** The selection bar while plain entities are ticked: into a folder, out of it, all, none. */
defineProps<{ count: number }>();

const emit = defineEmits<{
  move: [];
  takeOut: [];
  checkAll: [];
  clear: [];
}>();

const { t } = useI18n();
</script>

<style scoped>
/* The same look as the selection bar of entries, so both read as the same thing. */
.entity-bulk {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px;
  padding: 8px 8px 8px 12px;
  border-radius: 10px;
  background: var(--accent-soft);
}

.entity-bulk b {
  margin-right: auto;
  color: var(--accent);
  font-size: 13px;
}

.entity-bulk .btn {
  height: 30px;
  padding: 0 10px;
  font-size: 12.5px;
}

.entity-bulk__quiet {
  border-color: transparent;
  background: transparent;
}
</style>
