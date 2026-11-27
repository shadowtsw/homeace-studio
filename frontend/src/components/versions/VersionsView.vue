<template>
  <div class="versions-view">
    <p v-if="versions.isLoading && !view" class="versions-view__note">
      {{ t("versions.loading") }}
    </p>
    <p v-else-if="versions.hasError" class="versions-view__note">{{ t("versions.loadFailed") }}</p>

    <template v-else-if="view">
      <div class="versions-view__head">
        <b>{{ t("detail.tabs.versions") }}</b>
        <small>{{ countText }}</small>
        <span class="versions-view__spacer" />
        <div class="versions-view__seg" role="group">
          <button
            v-for="option in FILTERS"
            :key="option"
            type="button"
            :class="{ 'is-on': filter === option }"
            :aria-pressed="filter === option"
            @click="filter = option"
          >
            {{ t(`versions.filter.${option}`) }}
          </button>
        </div>
      </div>

      <div v-if="openVersion" class="versions-view__open">
        <span class="versions-view__dot" />
        <span class="versions-view__open-text">
          <b>{{ t("versions.openSince", { time: clock(openVersion.at) }) }}</b>
          · {{ t("versions.saves", { count: openVersion.saves ?? 1 }, openVersion.saves ?? 1) }} ·
          {{ t("versions.closesAt", { time: closesAt }) }}
        </span>
        <button class="btn" type="button" @click="versions.closeOpen()">
          {{ t("versions.closeNow") }}
        </button>
        <button class="btn" type="button" @click="openId = openVersion.id">
          {{ t("versions.view") }}
        </button>
      </div>

      <div class="versions-view__list">
        <VersionRow
          v-for="item in shown"
          :key="item.version.id"
          :version="item.version"
          :when="whenOf(item.version.at)"
          :between="betweenOf(item.version)"
          :summary="summaryOf({ versions: view.versions, index: item.index })"
          :is-newest="item.index === view.versions.length - 1"
          @open="openId = item.version.id"
        />
        <p v-if="!shown.length" class="versions-view__empty">{{ t("versions.emptyNamed") }}</p>
      </div>
      <p class="versions-view__foot">{{ t("versions.storageNote") }}</p>
    </template>

    <VersionCompareDialog
      v-if="view && openId"
      :entry="entry"
      :view="view"
      :version-id="openId"
      @pick="(id) => (openId = id)"
      @close="openId = null"
    />
  </div>
</template>

<script setup lang="ts">
import { useIntervalFn } from "@vueuse/core";
import { computed, ref, toRef, watch } from "vue";
import { useI18n } from "vue-i18n";

import { useVersionLines } from "@/composables/versions/useVersionLines";
import type { Version } from "@/services/versionsService";
import { useSettingsStore } from "@/stores/settingsStore";
import { useVersionsStore } from "@/stores/versionsStore";
import type { Entry } from "@/types/entry";
import { clockTime } from "@/utils/runs/runTime";

import VersionCompareDialog from "./VersionCompareDialog.vue";
import VersionRow from "./VersionRow.vue";

/** Limits as in the backend (versions.constants.ts), for the count line. */
const MAX_UNNAMED = 20;
const MAX_NAMED = 10;
const FILTERS = ["all", "named"] as const;
const MINUTE_MS = 60_000;

const props = defineProps<{ entry: Entry }>();

const { t } = useI18n();
const versions = useVersionsStore();
const settings = useSettingsStore();
const { whenOf, summaryOf } = useVersionLines({ entry: toRef(props, "entry") });
// The time moves on twice a minute: enough for "noch N min".
const now = ref(new Date());
useIntervalFn(() => (now.value = new Date()), 30_000);

const filter = ref<(typeof FILTERS)[number]>("all");
const openId = ref<string | null>(null);

watch(
  () => props.entry.entityId,
  (entityId) => {
    openId.value = null;
    void versions.load(entityId);
  },
  { immediate: true },
);

const view = computed(() =>
  versions.current?.ref.entityId === props.entry.entityId ? versions.current : null,
);
const openVersion = computed(() => {
  const id = view.value?.openVersionId;
  return view.value?.versions.find((version) => version.id === id) ?? null;
});

/** Newest first; the open version has its own row above. */
const shown = computed(() => {
  const list = view.value?.versions ?? [];
  const indexed = list.map((version, index) => ({ version, index })).reverse();
  return indexed.filter(
    (item) =>
      item.version.id !== openVersion.value?.id && (filter.value === "all" || item.version.name),
  );
});

const countText = computed(() => {
  const list = view.value?.versions ?? [];
  const named = list.filter((version) => version.name).length;
  return t("versions.count", {
    unnamed: list.length - named,
    max: MAX_UNNAMED,
    named,
    maxNamed: MAX_NAMED,
  });
});

const clock = (iso: string): string => clockTime({ iso, locale: settings.locale });
const closesAt = computed(() => {
  const until = openVersion.value?.openUntil ?? now.value.getTime();
  return clock(new Date(Math.max(until, now.value.getTime() + MINUTE_MS)).toISOString());
});

function betweenOf(version: Version): { from: string; to: string } | null {
  if (version.source !== "offline" || !version.since) return null;
  return { from: whenOf(version.since), to: whenOf(version.at) };
}
</script>

<style scoped>
.versions-view {
  display: grid;
  gap: 10px;
}

.versions-view__head {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px 12px;
}

.versions-view__head b {
  font: 700 16px/1.2 var(--font-display);
}

.versions-view__head small,
.versions-view__note,
.versions-view__foot,
.versions-view__empty {
  color: var(--muted);
  font-size: 12.5px;
}

.versions-view__spacer {
  flex: 1;
}

.versions-view__seg {
  display: flex;
  gap: 2px;
  padding: 3px;
  border-radius: 9px;
  background: var(--sunken);
}

.versions-view__seg button {
  padding: 4px 9px;
  border: 0;
  border-radius: 7px;
  background: transparent;
  color: var(--muted);
  font-size: 12.5px;
  font-weight: 600;
  cursor: pointer;
}

.versions-view__seg button.is-on {
  background: var(--surface);
  color: var(--fg);
}

.versions-view__open {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 10px;
  padding: 10px 12px;
  border: 1px dashed var(--accent);
  border-radius: 12px;
  background: var(--accent-soft);
  font-size: 13px;
}

.versions-view__open-text {
  flex: 1;
  min-width: 180px;
}

.versions-view__dot {
  flex: none;
  width: 9px;
  height: 9px;
  border-radius: 50%;
  background: var(--accent);
}

.versions-view__list {
  display: grid;
  gap: 6px;
}
</style>
