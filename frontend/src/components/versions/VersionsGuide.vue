<template>
  <section v-if="!isRead" class="versions-guide" :aria-label="t('versions.guide.title')">
    <div class="versions-guide__head">
      <span class="mdi mdi-information-outline" />
      <b>{{ t("versions.guide.title") }}</b>
      <span class="versions-guide__spacer" />
      <button class="btn btn--sm" type="button" @click="isRead = true">
        {{ t("versions.guide.ok") }}
      </button>
    </div>
    <ul>
      <li v-for="line in LINES" :key="line.key">
        <span class="mdi" :class="line.icon" />
        <span>{{ t(`versions.guide.${line.key}`, LIMITS) }}</span>
      </li>
    </ul>
    <div class="versions-guide__more">
      <button class="versions-guide__link" type="button" @click="showMore">
        {{ t("settings.more") }} ›
      </button>
    </div>
  </section>
  <button v-else class="versions-guide__again" type="button" @click="isRead = false">
    <span class="mdi mdi-information-outline" />{{ t("versions.guide.title")
    }}<span class="mdi mdi-chevron-right" />
  </button>
</template>

<script setup lang="ts">
import { useI18n } from "vue-i18n";

import { usePreference } from "@/composables/usePreference";
import { PREFERENCES } from "@/constants/preferences";
import { GOOD_TO_KNOW_TOPIC } from "@/constants/settings";
import { VERSION_LIMITS } from "@/constants/versions";
import { useSettingsWindowStore } from "@/stores/settingsWindowStore";

/** Five lines, each about one behaviour; never how it is built. */
const LINES = [
  { key: "save", icon: "mdi-content-save-outline" },
  { key: "outside", icon: "mdi-home-outline" },
  { key: "keep", icon: "mdi-pin-outline" },
  { key: "restore", icon: "mdi-history" },
  { key: "trash", icon: "mdi-delete-outline" },
] as const;
const LIMITS = { max: VERSION_LIMITS.unnamed, maxNamed: VERSION_LIMITS.named };

/**
 * How versions work, at the top of the "Versionen" tab. Open until "Verstanden" (kept per device),
 * then one line that opens it again; "Mehr dazu" leads to the topic in "Gut zu wissen".
 */
const { t } = useI18n();
const settingsWindow = useSettingsWindowStore();
const isRead = usePreference({ preference: PREFERENCES.versionsGuideRead, defaultValue: false });

/** Opens the settings window right at the topic. */
function showMore(): void {
  settingsWindow.showTopic(GOOD_TO_KNOW_TOPIC.versions);
}
</script>

<style scoped>
.versions-guide {
  padding: 12px 14px;
  border: 1px solid var(--line);
  border-radius: 12px;
  background: var(--accent-soft);
  font-size: 13px;
}

.versions-guide__head {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 6px;
}

.versions-guide__head > .mdi {
  color: var(--accent);
  font-size: 18px;
}

.versions-guide__spacer {
  flex: 1;
}

.versions-guide ul {
  display: grid;
  gap: 5px;
  margin: 0;
  padding: 0;
  list-style: none;
}

.versions-guide li {
  display: grid;
  grid-template-columns: 24px minmax(0, 1fr);
  align-items: start;
  line-height: 1.45;
}

.versions-guide li .mdi {
  color: var(--muted);
  font-size: 16px;
}

.versions-guide__more {
  display: flex;
  justify-content: flex-end;
  margin-top: 4px;
}

.versions-guide__link {
  padding: 0;
  border: 0;
  background: none;
  color: var(--accent);
  font: inherit;
  font-weight: 600;
  text-decoration: underline;
  cursor: pointer;
}

.versions-guide__again {
  display: inline-flex;
  align-items: center;
  align-self: start;
  gap: 6px;
  padding: 4px 10px 4px 8px;
  border: 1px solid var(--line);
  border-radius: 999px;
  background: var(--surface);
  color: var(--muted);
  font: inherit;
  font-size: 12.5px;
  font-weight: 600;
  cursor: pointer;
}

.versions-guide__again > .mdi:first-child {
  color: var(--accent);
}
</style>
