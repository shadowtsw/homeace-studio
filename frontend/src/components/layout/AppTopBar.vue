<template>
  <header class="app-top-bar">
    <div class="app-top-bar__brand">
      <span class="app-top-bar__mark"><span class="mdi mdi-file-tree-outline" /></span>
      <span class="app-top-bar__name">HomeAce Studio</span>
      <PreviewNote v-if="IS_PREVIEW" />
      <span class="app-top-bar__tagline">{{ t("app.tagline") }}</span>
    </div>

    <span class="app-top-bar__status" :class="`app-top-bar__status--${status}`">
      <span class="app-top-bar__led" />
      <span class="app-top-bar__status-text">{{ statusText }}</span>
    </span>

    <div class="app-top-bar__menus">
      <WhatsNewMenu />
      <LanguageMenu />
      <button
        class="icon-btn"
        type="button"
        :aria-label="t('settings.open')"
        :title="t('settings.open')"
        @click="settingsWindow.open()"
      >
        <span class="mdi mdi-cog-outline" />
      </button>
    </div>
  </header>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { useI18n } from "vue-i18n";

import { useEntriesStore } from "@/stores/entriesStore";
import { useSettingsWindowStore } from "@/stores/settingsWindowStore";
import { isPreviewVersion } from "@/utils/releaseChannel";

import LanguageMenu from "./LanguageMenu.vue";
import PreviewNote from "./PreviewNote.vue";
import WhatsNewMenu from "./WhatsNewMenu.vue";

type ConnectionStatus = "loading" | "connected" | "failed";

/** The Preview app shows its mark next to the name (set at build time, vite.config.ts). */
const IS_PREVIEW = isPreviewVersion(__APP_VERSION__);

const props = defineProps<{
  /** The live event stream is open, so changes in HA show up on their own. */
  isLive: boolean;
}>();

const { t } = useI18n();
const settingsWindow = useSettingsWindowStore();
const entriesStore = useEntriesStore();

/** How the connection to HA stands, as loading the entries shows it. */
const status = computed((): ConnectionStatus => {
  if (entriesStore.hasLoadError) return "failed";
  if (entriesStore.isLoading) return "loading";

  return "connected";
});

const statusText = computed(() => {
  const entryCount = entriesStore.entries.length;

  if (status.value === "connected" && props.isLive) {
    return t("connection.live", { count: entryCount });
  }

  if (status.value === "connected") return t("connection.connected", { count: entryCount });
  if (status.value === "failed") return t("connection.failed");

  return t("connection.loading");
});
</script>

<style scoped>
.app-top-bar {
  display: flex;
  align-items: center;
  gap: 12px;
  padding-block: 10px;
  padding-left: max(16px, env(safe-area-inset-left, 0px));
  padding-right: max(16px, env(safe-area-inset-right, 0px));
  padding-top: calc(10px + env(safe-area-inset-top, 0px));
  background: var(--surface);
  border-bottom: 1px solid var(--line);
}

.app-top-bar__brand {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 10px;
  min-width: 0;
}

.app-top-bar__mark {
  display: grid;
  place-items: center;
  width: 30px;
  height: 30px;
  border-radius: 8px;
  background: var(--fg);
  color: var(--bg);
  font-size: 18px;
}

.app-top-bar__name {
  /* May shorten ("HomeAce St…") before anything else is pushed out of the bar. */
  overflow: hidden;
  min-width: 0;
  font: 700 19px/1 var(--font-display);
  letter-spacing: -0.01em;
  white-space: nowrap;
  text-overflow: ellipsis;
}

.app-top-bar__tagline {
  overflow: hidden;
  color: var(--muted);
  font-size: 13px;
  white-space: nowrap;
  text-overflow: ellipsis;
}

.app-top-bar__status {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  height: 28px;
  padding: 0 11px;
  border-radius: 999px;
  border: 1px solid var(--line);
  background: var(--surface-2);
  color: var(--muted);
  font-size: 12.5px;
  white-space: nowrap;
}

.app-top-bar__menus {
  position: relative;
  display: flex;
  align-items: center;
  gap: 2px;
}

.app-top-bar__led {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--faint);
}

.app-top-bar__status--connected .app-top-bar__led {
  background: var(--ok);
  box-shadow: 0 0 0 3px var(--ok-soft);
}

.app-top-bar__status--failed .app-top-bar__led {
  background: var(--err);
  box-shadow: 0 0 0 3px var(--err-soft);
}

@media (max-width: 820px) {
  .app-top-bar__tagline,
  .app-top-bar__status-text {
    display: none;
  }
}

/* Narrow phones: the logo stays, the name gives way, so nothing sticks out on the right (the bar
   needs about 400 px with "Was ist neu", the language and the gear). */
@media (max-width: 420px) {
  .app-top-bar {
    gap: 8px;
  }

  .app-top-bar__name {
    display: none;
  }
}
</style>
