<template>
  <span class="beta-badge" :title="t('entitySorting.betaTitle')">{{
    t("entitySorting.beta")
  }}</span>
</template>

<script setup lang="ts">
import { useI18n } from "vue-i18n";

/** Marks a feature that is new and may still be off; any feature can wear it. */
const { t } = useI18n();
</script>

<style scoped>
.beta-badge {
  display: inline-block;
  padding: 0 6px;
  border: 1px solid currentColor;
  border-radius: 999px;
  color: var(--accent);
  font: 700 10.5px/1.6 var(--font-body);
  letter-spacing: 0.06em;
  text-transform: uppercase;
  vertical-align: middle;
  white-space: nowrap;
}
</style>
