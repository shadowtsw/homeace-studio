<template>
  <button type="button" class="version-row" @click="emit('open')">
    <span class="version-row__icon" :class="`version-row__icon--${version.source}`">
      <span class="mdi" :class="SOURCE_ICONS[version.source]" />
    </span>
    <span class="version-row__main">
      <span class="version-row__when">
        {{ when }}
        <span v-if="version.name" class="version-row__name">
          <span class="mdi mdi-pin-outline" />„{{ version.name }}“
        </span>
        <span v-if="isNewest" class="version-row__now">{{ t("versions.isNow") }}</span>
      </span>
      <span class="version-row__source">{{ sourceText }}</span>
    </span>
    <span v-if="summary" class="version-row__summary">{{ summary }}</span>
  </button>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { useI18n } from "vue-i18n";

import type { Version, VersionSource } from "@/services/versionsService";

const SOURCE_ICONS: Record<VersionSource, string> = {
  base: "mdi-flag-outline",
  homeace: "mdi-pencil-outline",
  outside: "mdi-home-outline",
  offline: "mdi-home-clock-outline",
  restore: "mdi-history",
  ai: "mdi-creation",
};

const props = defineProps<{
  version: Version;
  /** "Heute 20:00" */
  when: string;
  /** The window of a change while HomeAce Studio was not running, already formatted. */
  between: { from: string; to: string } | null;
  summary: string;
  isNewest: boolean;
}>();

const emit = defineEmits<{ open: [] }>();

const { t } = useI18n();

const sourceText = computed(() => {
  const source = t(`versions.source.${props.version.source}`);
  const who = props.version.user ? ` · ${props.version.user.name}` : "";
  const timeWindow = props.between ? ` (${t("versions.between", props.between)})` : "";
  return source + who + timeWindow;
});
</script>

<style scoped>
.version-row {
  display: flex;
  align-items: center;
  gap: 12px;
  width: 100%;
  padding: 10px 12px;
  border: 1px solid var(--line);
  border-radius: 12px;
  background: var(--surface);
  color: inherit;
  text-align: left;
  cursor: pointer;
}

.version-row:hover {
  border-color: var(--line-strong);
}

.version-row__icon {
  display: grid;
  flex: none;
  place-items: center;
  width: 30px;
  height: 30px;
  border-radius: 8px;
  background: var(--sunken);
  color: var(--muted);
}

.version-row__icon--outside,
.version-row__icon--offline {
  background: var(--warn-soft);
  color: var(--warn);
}

.version-row__icon--restore {
  background: var(--ok-soft);
  color: var(--ok);
}

.version-row__main {
  display: grid;
  flex: 1;
  gap: 1px;
  min-width: 0;
}

.version-row__when {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px;
  font-weight: 600;
}

.version-row__name {
  color: var(--accent);
}

.version-row__now {
  padding: 1px 6px;
  border-radius: 5px;
  background: var(--sunken);
  color: var(--muted);
  font-size: 10.5px;
  font-weight: 700;
  letter-spacing: 0.05em;
  text-transform: uppercase;
}

.version-row__source,
.version-row__summary {
  color: var(--muted);
  font-size: 12.5px;
}

.version-row__summary {
  max-width: 46%;
  text-align: right;
}

@media (max-width: 640px) {
  .version-row {
    flex-wrap: wrap;
  }

  .version-row__summary {
    flex-basis: 100%;
    max-width: none;
    padding-left: 42px;
    text-align: left;
  }
}
</style>
