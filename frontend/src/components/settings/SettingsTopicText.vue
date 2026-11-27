<template>
  <div class="topic-text">
    <h3>{{ t(`settings.goodToKnow.${topic}.title`) }}</h3>
    <SettingsColumnsSketch v-if="topic === GOOD_TO_KNOW_TOPIC.columns" />
    <p>{{ t(`settings.goodToKnow.${topic}.text`, { key: modifierKey }) }}</p>
    <p v-if="te(`settings.goodToKnow.${topic}.more`)">
      {{ t(`settings.goodToKnow.${topic}.more`, { key: modifierKey }) }}
    </p>

    <!-- Where it fits, the switch sits right at the text -->
    <div v-if="topic === GOOD_TO_KNOW_TOPIC.saving" class="settings-card">
      <SettingsRow
        :title="t('settings.autoSaveScenes')"
        :hint="t('settings.autoSaveScenesHint')"
        :preference="PREFERENCES.sceneAutoSave"
      >
        <SwitchToggle v-model="settings.isSceneAutoSave" :label="t('settings.autoSaveScenes')" />
      </SettingsRow>
    </div>

    <ul v-if="topic === GOOD_TO_KNOW_TOPIC.whereStored" class="topic-text__legend">
      <li><span class="mdi mdi-account-outline" />{{ t("settings.scope.user") }}</li>
      <li><span class="mdi mdi-monitor" />{{ t("settings.scope.device") }}</li>
      <li><span class="mdi mdi-home-outline" />{{ t("settings.scope.addon") }}</li>
    </ul>

    <ul
      v-if="topic === GOOD_TO_KNOW_TOPIC.filterCounts"
      class="topic-text__folders"
      :aria-label="t('settings.goodToKnow.filterCounts.legend')"
    >
      <li v-for="example in FOLDER_EXAMPLES" :key="example.key">
        <span
          class="topic-text__folder"
          :class="{ 'topic-text__folder--faded': example.count === 0 }"
        >
          <span class="mdi" :class="example.icon" />
          <span class="topic-text__folder-name">
            {{ t(`settings.goodToKnow.filterCounts.${example.key}.name`) }}
          </span>
          <span class="topic-text__folder-count">{{ example.count }}</span>
        </span>
        <span>{{ t(example.text) }}</span>
      </li>
    </ul>
  </div>
</template>

<script setup lang="ts">
import { useI18n } from "vue-i18n";

import SwitchToggle from "@/components/common/SwitchToggle.vue";
import { useModifierKey } from "@/composables/useModifierKey";
import { PREFERENCES } from "@/constants/preferences";
import { GOOD_TO_KNOW_TOPIC, type GoodToKnowTopic } from "@/constants/settings";
import { useSettingsStore } from "@/stores/settingsStore";

import SettingsColumnsSketch from "./SettingsColumnsSketch.vue";
import SettingsRow from "./SettingsRow.vue";

/** The text of one "Gut zu wissen" topic: next to the topics on wide screens, a page on phones. */
defineProps<{ topic: GoodToKnowTopic }>();

const { t, te } = useI18n();
const settings = useSettingsStore();
/** Used by the topic about combining filters. */
const modifierKey = useModifierKey();

/** The folder looks the topic about numbers explains, drawn as the navigation draws them. */
const FOLDER_EXAMPLES = [
  {
    key: "found",
    icon: "mdi-folder",
    count: 3,
    text: "settings.goodToKnow.filterCounts.found.text",
  },
  {
    key: "faded",
    icon: "mdi-folder",
    count: 0,
    text: "settings.goodToKnow.filterCounts.faded.text",
  },
  { key: "folderOnly", icon: "mdi-folder-outline", count: 2, text: "nav.folderOnly" },
] as const;
</script>

<style scoped>
.topic-text h3 {
  margin: 2px 0 10px;
  font: 700 18px/1.25 var(--font-display);
}

.topic-text p {
  max-width: 62ch;
  margin: 0 0 10px;
  line-height: 1.55;
}

.topic-text .settings-card {
  max-width: 62ch;
  margin-top: 16px;
}

.topic-text__legend,
.topic-text__folders {
  display: grid;
  max-width: 62ch;
  margin: 12px 0 0;
  padding: 10px 12px;
  border-radius: 10px;
  background: var(--sunken);
  font-size: 13px;
  list-style: none;
}

.topic-text__legend {
  gap: 6px;
}

.topic-text__legend li {
  display: flex;
  align-items: center;
  gap: 8px;
}

.topic-text__legend .mdi {
  color: var(--muted);
}

.topic-text__folders {
  gap: 8px;
}

.topic-text__folders li {
  display: grid;
  grid-template-columns: 150px minmax(0, 1fr);
  gap: 12px;
  align-items: center;
}

/* Drawn like a row of the navigation */
.topic-text__folder {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 4px 8px;
  border-radius: 7px;
  background: var(--surface);
}

.topic-text__folder .mdi {
  color: var(--faint);
  font-size: 17px;
}

.topic-text__folder-name {
  flex: 1;
}

.topic-text__folder-count {
  color: var(--faint);
  font-size: 12px;
  font-variant-numeric: tabular-nums;
}

.topic-text__folder--faded .mdi,
.topic-text__folder--faded .topic-text__folder-name,
.topic-text__folder--faded .topic-text__folder-count {
  opacity: 0.5;
}

@media (max-width: 820px) {
  .topic-text__folders li {
    grid-template-columns: minmax(0, 1fr);
    gap: 4px;
  }
}
</style>
