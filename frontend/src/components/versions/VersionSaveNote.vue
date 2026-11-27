<template>
  <div v-if="text" class="version-save-note" role="status">
    <span class="mdi mdi-check-circle-outline" />
    <span>{{ text }}</span>
  </div>
</template>

<script setup lang="ts">
import { useIntervalFn } from "@vueuse/core";
import { computed, ref } from "vue";
import { useI18n } from "vue-i18n";

import { useSettingsStore } from "@/stores/settingsStore";
import { useVersionsStore } from "@/stores/versionsStore";
import { clockTime } from "@/utils/runs/runTime";

const MINUTE_MS = 60_000;

/**
 * After a save in HomeAce Studio: which version it went into and how long saves still join it
 * (automatic saving would otherwise make a version every few seconds). Gone once the version closes.
 */
const props = defineProps<{ entityId: string }>();

const { t } = useI18n();
const versions = useVersionsStore();
const settings = useSettingsStore();
// The time moves on twice a minute: enough for "noch N min".
const now = ref(new Date());
useIntervalFn(() => (now.value = new Date()), 30_000);

const text = computed(() => {
  const view = versions.current;
  if (versions.lastSavedEntityId !== props.entityId || view?.ref.entityId !== props.entityId) {
    return "";
  }
  const open = view.versions.find((version) => version.id === view.openVersionId);
  if (!open?.openUntil || open.openUntil <= now.value.getTime()) return "";

  const minutes = Math.max(1, Math.ceil((open.openUntil - now.value.getTime()) / MINUTE_MS));
  if ((open.saves ?? 1) <= 1) return t("versions.saveNote.started", { minutes });

  const time = clockTime({ iso: open.at, locale: settings.locale });
  return t("versions.saveNote.joined", { time, minutes });
});
</script>

<style scoped>
.version-save-note {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 28px;
  border-top: 1px solid var(--line);
  background: var(--surface);
  color: var(--muted);
  font-size: 12.5px;
}

.version-save-note .mdi {
  color: var(--ok);
}
</style>
