<template>
  <button
    class="detail-fold"
    type="button"
    :title="layout.isDetailFolded ? t('detail.unfold') : t('detail.fold')"
    :aria-label="layout.isDetailFolded ? t('detail.unfold') : t('detail.fold')"
    :aria-expanded="!layout.isDetailFolded"
    @click="layout.isDetailFolded = !layout.isDetailFolded"
  >
    <span class="mdi" :class="layout.isDetailFolded ? 'mdi-chevron-left' : 'mdi-chevron-right'" />
  </button>
</template>

<script setup lang="ts">
import { useI18n } from "vue-i18n";

import { useLayoutStore } from "@/stores/layoutStore";

/** The round button on the list splitter that folds the detail column away and back. */
const { t } = useI18n();
const layout = useLayoutStore();
</script>

<style scoped>
/* In the middle of the list splitter; the folded detail leaves the list the whole width. */
.detail-fold {
  display: grid;
  place-items: center;
  width: 22px;
  height: 44px;
  padding: 0;
  border: 1px solid var(--line-strong);
  border-radius: 999px;
  background: var(--surface);
  box-shadow: var(--shadow);
  color: var(--muted);
  cursor: pointer;
  font-size: 18px;
  /* On the detail side of the line, so it never covers the list's scrollbar. */
  transform: translateX(calc(50% + 2px));
  /* Folded, the splitter takes no pointer events (no resizing); the button stays clickable. */
  pointer-events: auto;
}

.detail-fold:hover {
  border-color: var(--accent);
  color: var(--fg);
}
</style>
