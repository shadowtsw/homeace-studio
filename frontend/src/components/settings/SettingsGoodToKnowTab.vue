<template>
  <div class="good-to-know">
    <nav class="good-to-know__topics" :aria-label="t('settings.tabs.goodToKnow')">
      <button
        v-for="entry in GOOD_TO_KNOW_TOPICS"
        :key="entry.topic"
        class="good-to-know__topic"
        :class="{ 'good-to-know__topic--on': entry.topic === settingsWindow.goodToKnowTopic }"
        type="button"
        :aria-current="entry.topic === settingsWindow.goodToKnowTopic"
        @click="settingsWindow.showTopic(entry.topic)"
      >
        <span class="mdi" :class="entry.icon" />
        {{ t(`settings.goodToKnow.${entry.topic}.title`) }}
      </button>
    </nav>

    <article ref="text" class="good-to-know__text">
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

      <ul v-if="topic === GOOD_TO_KNOW_TOPIC.whereStored" class="good-to-know__legend">
        <li><span class="mdi mdi-account-outline" />{{ t("settings.scope.user") }}</li>
        <li><span class="mdi mdi-monitor" />{{ t("settings.scope.device") }}</li>
        <li><span class="mdi mdi-home-outline" />{{ t("settings.scope.addon") }}</li>
      </ul>

      <ul
        v-if="topic === GOOD_TO_KNOW_TOPIC.filterCounts"
        class="good-to-know__folders"
        :aria-label="t('settings.goodToKnow.filterCounts.legend')"
      >
        <li v-for="example in FOLDER_EXAMPLES" :key="example.key">
          <span
            class="good-to-know__folder"
            :class="{ 'good-to-know__folder--faded': example.count === 0 }"
          >
            <span class="mdi" :class="example.icon" />
            <span class="good-to-know__folder-name">
              {{ t(`settings.goodToKnow.filterCounts.${example.key}.name`) }}
            </span>
            <span class="good-to-know__folder-count">{{ example.count }}</span>
          </span>
          <span>{{ t(example.text) }}</span>
        </li>
      </ul>
    </article>
  </div>
</template>

<script setup lang="ts">
import { computed, useTemplateRef, watch } from "vue";
import { useI18n } from "vue-i18n";

import SwitchToggle from "@/components/common/SwitchToggle.vue";
import { useModifierKey } from "@/composables/useModifierKey";
import { PREFERENCES } from "@/constants/preferences";
import { GOOD_TO_KNOW_TOPIC, GOOD_TO_KNOW_TOPICS } from "@/constants/settings";
import { useSettingsStore } from "@/stores/settingsStore";
import { useSettingsWindowStore } from "@/stores/settingsWindowStore";

import SettingsColumnsSketch from "./SettingsColumnsSketch.vue";
import SettingsRow from "./SettingsRow.vue";

/**
 * "Gut zu wissen": topics on the left, the short text on the right. It explains how HomeAce Studio
 * behaves, never how it is built; it is no manual.
 */
const { t, te } = useI18n();
const settings = useSettingsStore();
const settingsWindow = useSettingsWindowStore();

const topic = computed(() => settingsWindow.goodToKnowTopic);
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

// Topics and text scroll on their own; a new topic starts at the top of its text
const text = useTemplateRef<HTMLElement>("text");
watch(topic, () => text.value?.scrollTo({ top: 0 }));
</script>

<style scoped>
/* Topics and text scroll on their own, so the topics stay in place. */
.good-to-know {
  display: grid;
  grid-template-columns: 230px minmax(0, 1fr);
  gap: 22px;
  height: 100%;
}

.good-to-know__topics,
.good-to-know__text {
  min-height: 0;
  overflow: auto;
}

.good-to-know__topics {
  display: grid;
  align-content: start;
  gap: 2px;
  /* Room for the focus ring inside the scroll area */
  padding: 2px;
}

.good-to-know__topic {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 9px 10px;
  border: 0;
  border-radius: 9px;
  background: none;
  color: var(--fg);
  font-size: 13.5px;
  text-align: left;
  cursor: pointer;
}

.good-to-know__topic:hover {
  background: var(--sunken);
}

.good-to-know__topic .mdi {
  color: var(--muted);
  font-size: 18px;
}

.good-to-know__topic--on,
.good-to-know__topic--on .mdi {
  background: var(--accent-soft);
  color: var(--accent);
  font-weight: 600;
}

.good-to-know__text h3 {
  margin: 2px 0 10px;
  font: 700 18px/1.25 var(--font-display);
}

.good-to-know__text p {
  max-width: 62ch;
  margin: 0 0 10px;
  line-height: 1.55;
}

.good-to-know__text .settings-card {
  max-width: 62ch;
  margin-top: 16px;
}

.good-to-know__legend {
  display: grid;
  gap: 6px;
  max-width: 62ch;
  margin: 12px 0 0;
  padding: 10px 12px;
  border-radius: 10px;
  background: var(--sunken);
  font-size: 13px;
  list-style: none;
}

.good-to-know__legend li {
  display: flex;
  align-items: center;
  gap: 8px;
}

.good-to-know__legend .mdi {
  color: var(--muted);
}

.good-to-know__folders {
  display: grid;
  gap: 8px;
  max-width: 62ch;
  margin: 12px 0 0;
  padding: 10px 12px;
  border-radius: 10px;
  background: var(--sunken);
  font-size: 13px;
  list-style: none;
}

.good-to-know__folders li {
  display: grid;
  grid-template-columns: 150px minmax(0, 1fr);
  gap: 12px;
  align-items: center;
}

/* Drawn like a row of the navigation */
.good-to-know__folder {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 4px 8px;
  border-radius: 7px;
  background: var(--surface);
}

.good-to-know__folder .mdi {
  color: var(--faint);
  font-size: 17px;
}

.good-to-know__folder-name {
  flex: 1;
}

.good-to-know__folder-count {
  color: var(--faint);
  font-size: 12px;
  font-variant-numeric: tabular-nums;
}

.good-to-know__folder--faded .mdi,
.good-to-know__folder--faded .good-to-know__folder-name,
.good-to-know__folder--faded .good-to-know__folder-count {
  opacity: 0.5;
}

/* Phone: topics above the text, one scroll as before */
@media (max-width: 820px) {
  .good-to-know {
    grid-template-columns: minmax(0, 1fr);
    height: auto;
  }

  .good-to-know__topics,
  .good-to-know__text {
    overflow: visible;
  }

  .good-to-know__folders li {
    grid-template-columns: minmax(0, 1fr);
    gap: 4px;
  }
}
</style>
