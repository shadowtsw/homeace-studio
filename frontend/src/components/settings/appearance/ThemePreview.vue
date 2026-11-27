<template>
  <!-- A small copy of the app's look in the draft's colours; nothing in it can be clicked -->
  <div class="theme-preview" :style="tokens" aria-hidden="true" inert>
    <div class="theme-preview__row">
      <span class="theme-preview__icon mdi mdi-robot-outline" />
      <span class="theme-preview__row-text">
        <b>{{ t("settings.appearance.editor.sample.entry") }}</b>
        <small>{{ t("settings.appearance.editor.sample.entrySub") }}</small>
      </span>
    </div>

    <div class="theme-preview__section theme-preview__section--when">
      <span class="theme-preview__keyword">{{ t("flow.when") }}</span>
      <span class="theme-preview__block">
        <span class="theme-preview__chip">{{ t("settings.appearance.editor.sample.sensor") }}</span>
        {{ t("settings.appearance.editor.sample.trigger") }}
      </span>
    </div>
    <div class="theme-preview__section theme-preview__section--if">
      <span class="theme-preview__keyword">{{ t("flow.if") }}</span>
      <span class="theme-preview__block">
        <span class="theme-preview__chip">{{
          t("settings.appearance.editor.sample.condition")
        }}</span>
      </span>
    </div>
    <div class="theme-preview__section theme-preview__section--then">
      <span class="theme-preview__keyword">{{ t("flow.thenSection") }}</span>
      <span class="theme-preview__block">
        <span class="theme-preview__chip">{{ t("settings.appearance.editor.sample.light") }}</span>
        {{ t("settings.appearance.editor.sample.action") }}
      </span>
    </div>

    <div class="theme-preview__controls">
      <span class="btn btn--sm">{{ t("settings.appearance.editor.sample.button") }}</span>
      <span class="btn btn--sm btn--primary">{{ t("settings.appearance.editor.save") }}</span>
      <span class="theme-preview__switch theme-preview__switch--on" />
      <span class="theme-preview__switch" />
    </div>
    <p class="theme-preview__note">
      <span class="mdi mdi-information-outline" />{{ t("settings.appearance.editor.sample.note") }}
    </p>
  </div>
</template>

<script setup lang="ts">
import { useI18n } from "vue-i18n";

import type { ThemeTokens } from "@/core/themes/themeFormat";

/**
 * The editor's preview: a list row, a short flow with its three sections, buttons, switches and a
 * hint, drawn with the draft's tokens (inline), so the page itself keeps its own colours.
 */
defineProps<{ tokens: ThemeTokens }>();

const { t } = useI18n();
</script>

<style scoped>
.theme-preview {
  display: grid;
  gap: 8px;
  padding: 12px;
  border: 1px solid var(--line);
  border-radius: 12px;
  background: var(--bg);
  color: var(--fg);
  font-size: 13px;
  pointer-events: none;
  user-select: none;
}

.theme-preview__row {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 10px;
  border: 1px solid var(--line);
  border-radius: 10px;
  background: var(--surface);
}

.theme-preview__icon {
  display: grid;
  place-items: center;
  width: 30px;
  height: 30px;
  border-radius: 8px;
  background: var(--kind-automation-soft);
  color: var(--kind-automation);
  font-size: 18px;
}

.theme-preview__row-text {
  display: grid;
}

.theme-preview__row-text small {
  color: var(--muted);
  font-size: 11.5px;
}

.theme-preview__section {
  --section-color: var(--flow-then);
  --section-soft: var(--flow-then-soft);

  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px 8px;
}

.theme-preview__section--when {
  --section-color: var(--flow-when);
  --section-soft: var(--flow-when-soft);
}

.theme-preview__section--if {
  --section-color: var(--flow-if);
  --section-soft: var(--flow-if-soft);
}

.theme-preview__keyword {
  padding: 3px 8px;
  border-radius: 6px;
  background: var(--section-color);
  color: var(--on-accent);
  font-size: 10.5px;
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
}

.theme-preview__block {
  flex: 1 1 160px;
  padding: 6px 10px;
  border: 1px solid var(--line);
  border-radius: 10px;
  background: var(--surface);
  line-height: 22px;
}

.theme-preview__chip {
  margin-right: 4px;
  padding: 1px 8px;
  border-radius: 6px;
  background: var(--section-soft);
  color: var(--fg);
  font-weight: 600;
}

.theme-preview__controls {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
}

.theme-preview__switch {
  position: relative;
  width: 36px;
  height: 21px;
  border-radius: 999px;
  background: var(--line-strong);
}

.theme-preview__switch::after {
  content: "";
  position: absolute;
  top: 3px;
  left: 3px;
  width: 15px;
  height: 15px;
  border-radius: 50%;
  background: var(--surface);
}

.theme-preview__switch--on {
  background: var(--ok);
}

.theme-preview__switch--on::after {
  transform: translateX(15px);
}

.theme-preview__note {
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 0;
  padding: 8px 10px;
  border-radius: 10px;
  background: var(--accent-soft);
  color: var(--fg);
  font-size: 12.5px;
}

.theme-preview__note .mdi {
  color: var(--accent);
}
</style>
