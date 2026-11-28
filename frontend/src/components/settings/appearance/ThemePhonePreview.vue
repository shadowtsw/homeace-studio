<template>
  <!-- An automation as a phone shows it, in the draft's colours; drawn, not the live app -->
  <div class="phone-preview" aria-hidden="true" inert>
    <div class="phone-preview__screen" :style="tokens">
      <div class="phone-preview__top">
        <span class="phone-preview__mark mdi mdi-file-tree-outline" />
        <span class="phone-preview__space" />
        <span class="phone-preview__language">DE</span>
        <span class="mdi mdi-gift-outline" />
        <span class="mdi mdi-cog-outline" />
      </div>
      <div class="phone-preview__back">
        <span class="mdi mdi-arrow-left" />{{ t("settings.appearance.editor.sample.list") }}
      </div>
      <div class="phone-preview__head">
        <small>{{ t("settings.appearance.editor.sample.kind") }}</small>
        <b>{{ t("settings.appearance.editor.sample.entry") }}</b>
        <span class="phone-preview__tabs">
          <span class="phone-preview__tab--on">{{ t("detail.tabs.flow") }}</span>
          <span>{{ t("detail.tabs.dependencies") }}</span>
          <span>{{ t("detail.tabs.history") }}</span>
        </span>
      </div>
      <div class="phone-preview__body">
        <p class="phone-preview__note">
          <span class="mdi mdi-battery-alert-variant-outline" />
          {{ t("settings.appearance.editor.sample.battery") }}
        </p>
        <div class="phone-preview__section phone-preview__section--when">
          <span class="phone-preview__keyword">{{ t("flow.when") }}</span>
          <span class="phone-preview__block">
            <span class="phone-preview__chip">{{
              t("settings.appearance.editor.sample.sensor")
            }}</span>
            {{ t("settings.appearance.editor.sample.trigger") }}
          </span>
        </div>
        <div class="phone-preview__section phone-preview__section--if">
          <span class="phone-preview__keyword">{{ t("flow.if") }}</span>
          <span class="phone-preview__block">
            <span class="phone-preview__chip">
              {{ t("settings.appearance.editor.sample.condition") }}
            </span>
          </span>
        </div>
        <div class="phone-preview__section phone-preview__section--then">
          <span class="phone-preview__keyword">{{ t("flow.thenSection") }}</span>
          <span class="phone-preview__block">
            <span class="phone-preview__chip">{{
              t("settings.appearance.editor.sample.light")
            }}</span>
            {{ t("settings.appearance.editor.sample.action") }}
          </span>
        </div>
        <div class="phone-preview__controls">
          <span class="btn btn--sm">{{ t("settings.appearance.editor.sample.button") }}</span>
          <span class="btn btn--sm btn--primary">{{ t("settings.appearance.editor.save") }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useI18n } from "vue-i18n";

import type { ThemeTokens } from "@/core/themes/themeFormat";

/**
 * The phone preview of the editor (owner's variant B): an automation in the phone layout, live in
 * the draft's colours. A drawing of the app, not the app itself: the real app in a frame would
 * share this browser's storage and need a second live connection (owner's decision 2026-11-27).
 */
defineProps<{ tokens: ThemeTokens }>();

const { t } = useI18n();
</script>

<style scoped>
/* The device frame stays dark in every theme, like a real phone. */
.phone-preview {
  width: 300px;
  height: 600px;
  padding: 7px;
  border-radius: 34px;
  background: #1b1f29;
  box-shadow: 0 18px 40px rgba(0, 0, 0, 0.35);
  pointer-events: none;
  user-select: none;
}

.phone-preview__screen {
  display: flex;
  flex-direction: column;
  height: 100%;
  overflow: hidden;
  border-radius: 28px;
  background: var(--bg);
  color: var(--fg);
  font-size: 12px;
}

.phone-preview__top {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 14px 14px 8px;
  border-bottom: 1px solid var(--line);
  background: var(--surface);
  color: var(--muted);
  font-size: 16px;
}

.phone-preview__mark {
  display: grid;
  place-items: center;
  width: 24px;
  height: 24px;
  border-radius: 7px;
  background: var(--fg);
  color: var(--bg);
  font-size: 14px;
}

.phone-preview__space {
  flex: 1;
}

.phone-preview__language {
  font-size: 11px;
  font-weight: 700;
}

.phone-preview__back {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 8px 14px 0;
  background: var(--surface);
  color: var(--accent);
  font-weight: 600;
}

.phone-preview__head {
  display: grid;
  gap: 2px;
  padding: 6px 14px 0;
  border-bottom: 1px solid var(--line);
  background: var(--surface);
}

.phone-preview__head small {
  color: var(--kind-automation);
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
}

.phone-preview__head b {
  font: 700 16px/1.2 var(--font-display);
}

.phone-preview__tabs {
  display: flex;
  gap: 12px;
  margin-top: 6px;
  color: var(--muted);
  font-weight: 600;
}

.phone-preview__tabs span {
  padding: 6px 0;
  border-bottom: 2px solid transparent;
}

.phone-preview__tabs .phone-preview__tab--on {
  border-bottom-color: var(--fg);
  color: var(--fg);
}

.phone-preview__body {
  display: grid;
  align-content: start;
  gap: 10px;
  padding: 12px;
}

.phone-preview__note {
  display: flex;
  align-items: flex-start;
  gap: 6px;
  margin: 0;
  padding: 8px 10px;
  border-radius: 10px;
  background: var(--warn-soft);
  line-height: 1.35;
}

.phone-preview__note .mdi {
  color: var(--warn);
  font-size: 15px;
}

.phone-preview__section {
  --section-color: var(--flow-then);
  --section-on: var(--on-flow-then);
  --section-soft: var(--flow-then-soft);

  display: grid;
  gap: 5px;
}

.phone-preview__section--when {
  --section-color: var(--flow-when);
  --section-on: var(--on-flow-when);
  --section-soft: var(--flow-when-soft);
}

.phone-preview__section--if {
  --section-color: var(--flow-if);
  --section-on: var(--on-flow-if);
  --section-soft: var(--flow-if-soft);
}

.phone-preview__keyword {
  justify-self: start;
  padding: 3px 8px;
  border-radius: 6px;
  background: var(--section-color);
  color: var(--section-on);
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
}

.phone-preview__block {
  padding: 6px 8px;
  border: 1px solid var(--line);
  border-radius: 9px;
  background: var(--surface);
  line-height: 20px;
}

.phone-preview__chip {
  margin-right: 4px;
  padding: 1px 6px;
  border-radius: 6px;
  background: var(--section-soft);
  font-weight: 600;
}

.phone-preview__controls {
  display: flex;
  gap: 8px;
}
</style>
