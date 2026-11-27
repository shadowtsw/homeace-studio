<template>
  <ul class="contrast-checks" :aria-label="t('settings.appearance.editor.checksTitle')">
    <li v-for="check in checks" :key="check.id" :class="`contrast-checks__line--${check.level}`">
      <span class="mdi" :class="LEVEL_ICON[check.level]" />
      <span class="contrast-checks__text">
        {{ t(`settings.appearance.editor.checks.${check.id}`) }}:
        <b>{{ ratioText(check.ratio) }}</b>
        <template v-if="check.level === CONTRAST_LEVEL.weak">
          · {{ t("settings.appearance.editor.levelWeak", { ratio: ratioText(check.goodRatio) }) }}
        </template>
        <template v-else-if="check.level === CONTRAST_LEVEL.unreadable">
          · {{ t("settings.appearance.editor.levelUnreadable") }}
        </template>
      </span>
      <button
        v-if="check.level !== CONTRAST_LEVEL.good && !isDerived"
        class="contrast-checks__suggest"
        type="button"
        @click="emit('suggest', check)"
      >
        {{ t("settings.appearance.editor.suggest") }}
      </button>
    </li>
  </ul>
</template>

<script setup lang="ts">
import { useI18n } from "vue-i18n";

import {
  CONTRAST_LEVEL,
  type ContrastCheck,
  type ContrastLevel,
} from "@/utils/themes/contrastChecks";

const LEVEL_ICON: Record<ContrastLevel, string> = {
  good: "mdi-check-circle-outline",
  weak: "mdi-alert-outline",
  unreadable: "mdi-cancel",
};

/**
 * How readable the edited version is, with a suggestion where it is weak. Saving stays allowed:
 * the floor adjusts what would be unreadable.
 */
defineProps<{
  checks: ContrastCheck[];
  /** The derived dark version has no suggestions; its light version is what to change. */
  isDerived: boolean;
}>();

const emit = defineEmits<{ suggest: [check: ContrastCheck] }>();

const { t, locale } = useI18n();

function ratioText(ratio: number): string {
  const number = new Intl.NumberFormat(locale.value, {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  }).format(ratio);
  return t("settings.appearance.editor.ratio", { ratio: number });
}
</script>

<style scoped>
.contrast-checks {
  display: grid;
  gap: 4px;
  margin: 0;
  padding: 0;
  font-size: 12.5px;
  list-style: none;
}

.contrast-checks li {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 4px 8px;
}

.contrast-checks .mdi {
  font-size: 15px;
}

.contrast-checks__text {
  flex: 1 1 200px;
}

.contrast-checks__line--good .mdi {
  color: var(--ok);
}

.contrast-checks__line--weak .mdi {
  color: var(--warn);
}

.contrast-checks__line--unreadable .mdi {
  color: var(--err);
}

.contrast-checks__suggest {
  padding: 0;
  border: 0;
  background: none;
  color: var(--accent);
  font: inherit;
  text-decoration: underline;
  cursor: pointer;
}
</style>
