<template>
  <!-- List layout: the topics, then each topic as a page of its own -->
  <template v-if="settingsWindow.isListLayout">
    <SettingsTopicText v-if="settingsWindow.topic" :topic="settingsWindow.topic" />
    <nav v-else class="good-to-know__list" :aria-label="t('settings.tabs.goodToKnow')">
      <button
        v-for="entry in GOOD_TO_KNOW_TOPICS"
        :key="entry.topic"
        class="good-to-know__row"
        type="button"
        @click="settingsWindow.showTopic(entry.topic)"
      >
        <span class="mdi" :class="entry.icon" />
        <span class="good-to-know__row-title">
          {{ t(`settings.goodToKnow.${entry.topic}.title`) }}
        </span>
        <span class="mdi mdi-chevron-right good-to-know__chevron" />
      </button>
    </nav>
  </template>

  <!-- Tab layout: topics on the left, the text on the right -->
  <div v-else class="good-to-know">
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
      <SettingsTopicText :topic="settingsWindow.goodToKnowTopic" />
    </article>
  </div>
</template>

<script setup lang="ts">
import { useTemplateRef, watch } from "vue";
import { useI18n } from "vue-i18n";

import { GOOD_TO_KNOW_TOPICS } from "@/constants/settings";
import { useSettingsWindowStore } from "@/stores/settingsWindowStore";

import SettingsTopicText from "./SettingsTopicText.vue";

/**
 * "Gut zu wissen": short texts on how HomeAce Studio behaves, never how it is built; it is no
 * manual. Wide: topics next to the text. Phone: the topics, each a page of its own.
 */
const { t } = useI18n();
const settingsWindow = useSettingsWindowStore();

// Topics and text scroll on their own; a new topic starts at the top of its text
const text = useTemplateRef<HTMLElement>("text");
watch(
  () => settingsWindow.goodToKnowTopic,
  () => text.value?.scrollTo({ top: 0 }),
);
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

.good-to-know__list {
  display: grid;
}

.good-to-know__row {
  display: flex;
  align-items: center;
  gap: 12px;
  width: 100%;
  min-height: 48px;
  padding: 10px 4px;
  border: 0;
  border-bottom: 1px solid var(--line);
  background: none;
  color: var(--fg);
  text-align: left;
  cursor: pointer;
}

.good-to-know__row:hover {
  background: var(--surface-2);
}

.good-to-know__row .mdi {
  color: var(--muted);
  font-size: 18px;
}

.good-to-know__row-title {
  flex: 1;
  min-width: 0;
}

.good-to-know__row .good-to-know__chevron {
  color: var(--faint);
  font-size: 20px;
}
</style>
