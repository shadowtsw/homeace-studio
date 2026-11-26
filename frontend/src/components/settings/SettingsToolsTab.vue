<template>
  <p class="settings-note">
    <span class="mdi mdi-information-outline" />
    {{ t("settings.toolsNote") }}
  </p>
  <div class="settings-card">
    <SettingsRow :title="t('settings.cleanup')" :hint="t('settings.cleanupHint')">
      <button class="btn" type="button" @click="emit('cleanup')">
        {{ t("settings.toolOpen") }}
      </button>
    </SettingsRow>
    <SettingsRow :title="t('areas.tidy.title')" :hint="t('settings.tidyHint')">
      <button class="btn" type="button" @click="emit('tidy')">
        {{ t("settings.toolOpen") }}
      </button>
    </SettingsRow>
    <SettingsRow
      :title="t('settings.sortEntities')"
      :hint="t('settings.sortEntitiesHint')"
      :more-topic="GOOD_TO_KNOW_TOPIC.sortingEntities"
    >
      <template #badges>
        <BetaBadge />
        <span v-if="unsortedCount" class="tools-tab__count">
          {{ t("settings.unsortedCount", { count: unsortedCount }) }}
        </span>
      </template>
      <button class="btn btn--primary" type="button" @click="emit('sortEntities')">
        {{ t("settings.toolOpen") }}
      </button>
    </SettingsRow>
  </div>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { useI18n } from "vue-i18n";

import BetaBadge from "@/components/common/BetaBadge.vue";
import { GOOD_TO_KNOW_TOPIC } from "@/constants/settings";
import { useEntriesStore } from "@/stores/entriesStore";
import { useLookupsStore } from "@/stores/lookupsStore";

import SettingsRow from "./SettingsRow.vue";

/** Tools run in steps, so each opens its own window; nothing changes before its preview. */
const emit = defineEmits<{
  cleanup: [];
  tidy: [];
  sortEntities: [];
}>();

const { t } = useI18n();
const lookups = useLookupsStore();
const entriesStore = useEntriesStore();

// From the picker list (entities with a state), without automations, scripts, scenes and helpers:
// they have folders of their own. The tool itself also counts disabled ones.
const unsortedCount = computed(() => {
  const entryIds = new Set(entriesStore.entries.map((entry) => entry.entityId));

  return lookups.entities.filter(
    (entity) => entity.isInRegistry && !entity.categoryPath && !entryIds.has(entity.entityId),
  ).length;
});
void lookups.loadEntities();
</script>

<style scoped>
.tools-tab__count {
  margin-left: 4px;
  padding: 0 7px;
  border-radius: 999px;
  background: var(--warn-soft);
  color: var(--warn);
  font-size: 11px;
  font-weight: 700;
  vertical-align: middle;
  white-space: nowrap;
}
</style>
