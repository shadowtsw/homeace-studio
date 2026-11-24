<template>
  <div ref="root" class="whats-new">
    <button
      v-if="whatsNew.hasUnseen"
      class="icon-btn whats-new__button"
      type="button"
      :aria-label="t('whatsNew.open')"
      :title="t('whatsNew.title', { version: whatsNew.version })"
      :aria-expanded="whatsNew.isOpen"
      @click="whatsNew.isOpen ? whatsNew.close() : whatsNew.open()"
    >
      <span class="mdi mdi-gift-outline" />
      <span class="whats-new__dot" />
    </button>

    <div
      v-if="whatsNew.isOpen && newest"
      class="whats-new__panel"
      role="dialog"
      :aria-label="t('whatsNew.open')"
    >
      <header class="whats-new__head">
        <h2>{{ t("whatsNew.title", { version: newest.version }) }}</h2>
        <p>
          {{
            older.length > 0
              ? t("whatsNew.since", { count: older.length + 1 })
              : t("whatsNew.lastUpdate")
          }}
        </p>
      </header>

      <div class="whats-new__body">
        <div v-for="(item, index) in newest.items" :key="index" class="whats-new__item">
          <span class="mdi" :class="item.icon" />
          <div>
            <b>{{ item.title[locale] }}</b>
            <small>{{ item.text[locale] }}</small>
            <button v-if="item.show" class="whats-new__show" type="button" @click="show(item.show)">
              {{ t("whatsNew.show") }}
            </button>
          </div>
        </div>

        <p v-if="newest.more" class="whats-new__more">
          {{ t("whatsNew.more", newest.more) }}
        </p>

        <details v-for="release in older" :key="release.version" class="whats-new__older">
          <summary>{{ t("whatsNew.older", { version: release.version }) }}</summary>
          <ul>
            <li v-for="(item, index) in release.items" :key="index">{{ item.title[locale] }}</li>
          </ul>
        </details>
      </div>

      <footer class="whats-new__foot">
        <a :href="RELEASES_URL" target="_blank" rel="noopener noreferrer">
          <span class="mdi mdi-open-in-new" />{{ t("whatsNew.allChanges") }}
        </a>
        <button class="btn btn--primary" type="button" @click="whatsNew.confirm()">
          {{ t("whatsNew.ok") }}
        </button>
      </footer>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onClickOutside, onKeyStroke } from "@vueuse/core";
import { computed, nextTick, useTemplateRef } from "vue";
import { useI18n } from "vue-i18n";

import { RELEASES_URL, type WhatsNewTarget } from "@/constants/whatsNew";
import type { AppLocale } from "@/i18n";
import { useSettingsStore } from "@/stores/settingsStore";
import { useStudioStore } from "@/stores/studioStore";
import { useWhatsNewStore } from "@/stores/whatsNewStore";
import { flashElement } from "@/utils/flash";

const { t, locale: i18nLocale } = useI18n();
const whatsNew = useWhatsNewStore();
const settings = useSettingsStore();
const studio = useStudioStore();

const locale = computed(() => i18nLocale.value as AppLocale);
const newest = computed(() => whatsNew.releases[0] ?? null);
const older = computed(() => whatsNew.releases.slice(1));

/** Where "Zeigen" leads; the gift stays until "OK", so the user can come back. */
async function show(target: WhatsNewTarget): Promise<void> {
  whatsNew.close();

  if (target === "settings") {
    settings.isMenuOpen = true;
    await nextTick();
    flashElement(document.querySelector(".settings-menu__panel"));
  }

  if (target === "helpers") {
    studio.scope = "helper";
    await nextTick();
    flashElement(document.querySelector(".entry-list__scope--active"));
  }
}

const root = useTemplateRef("root");

onClickOutside(root, () => whatsNew.close());
onKeyStroke("Escape", () => whatsNew.close());
</script>

<style scoped>
/* No own position: the panel lines up with the right edge of the menu group in the top bar (like the
   gear menu), so it never leaves the screen on a phone. */
.whats-new {
  display: flex;
}

.whats-new__button {
  position: relative;
}

.whats-new__dot {
  position: absolute;
  top: 6px;
  right: 6px;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--accent);
  box-shadow: 0 0 0 2px var(--surface);
}

.whats-new__panel {
  position: absolute;
  right: 0;
  top: calc(100% + 6px);
  z-index: 100;
  display: flex;
  flex-direction: column;
  width: min(440px, calc(100vw - 24px));
  max-height: min(640px, 80vh);
  border-radius: 12px;
  border: 1px solid var(--line-strong);
  background: var(--surface);
  box-shadow: var(--shadow);
}

.whats-new__head {
  padding: 16px 18px 6px;
}

.whats-new__head h2 {
  margin: 0;
  font: 700 18px/1.25 var(--font-display);
}

.whats-new__head p {
  margin: 4px 0 0;
  color: var(--muted);
  font-size: 12.5px;
}

/* Only the list scrolls; heading and buttons stay in view. */
.whats-new__body {
  flex: 1;
  min-height: 0;
  overflow: auto;
  padding: 4px 10px 8px;
}

.whats-new__item {
  display: flex;
  gap: 11px;
  padding: 9px 8px;
  border-radius: 9px;
}

.whats-new__item:hover {
  background: var(--sunken);
}

.whats-new__item > .mdi {
  margin-top: 1px;
  color: var(--accent);
  font-size: 18px;
}

.whats-new__item b {
  display: block;
  font-size: 13.5px;
}

.whats-new__item small {
  display: block;
  margin-top: 1px;
  color: var(--muted);
  font-size: 12.5px;
  line-height: 1.45;
}

.whats-new__show {
  margin-top: 4px;
  padding: 0;
  border: 0;
  background: none;
  color: var(--accent);
  font: 600 12.5px var(--font-body);
  cursor: pointer;
}

.whats-new__show:hover {
  text-decoration: underline;
}

.whats-new__more {
  margin: 4px 8px 2px;
  color: var(--muted);
  font-size: 12.5px;
}

.whats-new__older {
  margin: 6px 8px 4px;
  padding-top: 8px;
  border-top: 1px solid var(--line);
}

.whats-new__older summary {
  color: var(--muted);
  font-size: 12.5px;
  font-weight: 600;
  cursor: pointer;
}

.whats-new__older ul {
  margin: 6px 0 0;
  padding-left: 18px;
  color: var(--muted);
  font-size: 12.5px;
  line-height: 1.5;
}

.whats-new__foot {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 14px;
  border-top: 1px solid var(--line);
}

.whats-new__foot a {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  color: var(--muted);
  font-size: 12.5px;
  text-decoration: none;
}

.whats-new__foot a:hover {
  color: var(--fg);
}

.whats-new__foot .btn {
  margin-left: auto;
}
</style>
