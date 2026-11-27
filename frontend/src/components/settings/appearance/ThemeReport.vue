<template>
  <ul class="theme-report" :aria-label="t('settings.appearance.reportTitle')">
    <li v-for="(line, index) in lines" :key="index" :class="`theme-report__line--${line.kind}`">
      <span class="mdi" :class="KIND_ICON[line.kind]" />
      <span>{{ reportText(line) }}</span>
    </li>
  </ul>
</template>

<script setup lang="ts">
import { useI18n } from "vue-i18n";

import { useThemeTexts } from "@/composables/texts/useThemeTexts";
import type { ReportKind } from "@/core/themes/checkTheme";
import type { ThemeReportLine } from "@/utils/themes/floorReport";

const KIND_ICON: Record<ReportKind, string> = {
  ok: "mdi-check-circle-outline",
  warn: "mdi-alert-outline",
  drop: "mdi-cancel",
};

/** The check report of an import, in plain words: what was fine, adjusted or dropped. */
defineProps<{ lines: ThemeReportLine[] }>();

const { t } = useI18n();
const { reportText } = useThemeTexts();
</script>

<style scoped>
.theme-report {
  display: grid;
  gap: 4px;
  margin: 0;
  padding: 10px 12px;
  border-radius: 10px;
  background: var(--sunken);
  font-size: 12.5px;
  line-height: 1.4;
  list-style: none;
}

.theme-report li {
  display: flex;
  align-items: flex-start;
  gap: 7px;
}

.theme-report .mdi {
  font-size: 15px;
}

.theme-report__line--ok .mdi {
  color: var(--ok);
}

.theme-report__line--warn .mdi {
  color: var(--warn);
}

.theme-report__line--drop .mdi {
  color: var(--err);
}
</style>
