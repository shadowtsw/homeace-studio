<template>
  <Teleport to="body">
    <div class="version-dialog" role="presentation" @click.self="emit('close')">
      <section class="version-dialog__panel" role="dialog" aria-modal="true" :aria-label="title">
        <header class="version-dialog__head">
          <h2>{{ title }}</h2>
          <p>{{ subtitle }}</p>
          <button
            class="icon-btn version-dialog__x"
            type="button"
            :aria-label="t('versions.compare.close')"
            @click="emit('close')"
          >
            <span class="mdi mdi-close" />
          </button>
        </header>

        <div class="version-dialog__bar">
          <div class="version-dialog__seg" role="group">
            <button
              v-for="option in SHOWS"
              :key="option"
              type="button"
              :class="{ 'is-on': show === option }"
              @click="show = option"
            >
              {{ t(`versions.compare.${option}`) }}
            </button>
          </div>
          <span class="version-dialog__legend">{{ t("versions.compare.legend") }}</span>
          <span class="version-dialog__spacer" />
          <span>{{ t("versions.compare.diffs", { count: diffCount }, diffCount) }}</span>
        </div>

        <VersionPicker
          :mode="mode"
          :versions="view.versions"
          :version-id="versionId"
          @pick="(id) => emit('pick', id)"
        />

        <div class="version-dialog__body">
          <p v-if="!diffCount && mode !== 'prev'" class="version-dialog__same">
            {{ t("versions.compare.sameAsNow") }}
          </p>
          <VersionCompareRows
            :rows="rows"
            :show="show"
            :is-restore="mode === 'restore'"
            :is-now-right="mode !== 'prev'"
            :older-title="sides.olderTitle"
            :newer-title="sides.newerTitle"
            :older-side="sides.olderSide"
            :newer-side="sides.newerSide"
            :only-old-text="sides.onlyOld"
            :only-new-text="sides.onlyNew"
          />
          <p v-if="mode === 'restore'" class="version-dialog__keep">
            {{ t("versions.compare.restoreKeep") }}
          </p>
        </div>

        <footer class="version-dialog__foot">
          <template v-if="mode === 'restore'">
            <span class="version-dialog__spacer" />
            <button class="btn" type="button" @click="mode = 'view'">
              {{ t("versions.compare.cancel") }}
            </button>
            <button class="btn btn--primary" type="button" :disabled="isBusy" @click="restore">
              <span class="mdi mdi-history" />{{ t("versions.compare.restoreConfirm") }}
            </button>
          </template>
          <template v-else-if="mode === 'prev'">
            <button class="btn" type="button" @click="mode = 'view'">
              <span class="mdi mdi-arrow-left" />{{ t("versions.compare.back") }}
            </button>
          </template>
          <template v-else>
            <button v-if="previous" class="btn" type="button" @click="mode = 'prev'">
              <span class="mdi mdi-compare-horizontal" />{{ t("versions.compare.withPrevious") }}
            </button>
            <VersionNameControl :version="version" @name="nameVersion" />
            <span class="version-dialog__spacer" />
            <button
              class="btn btn--primary"
              type="button"
              :disabled="!diffCount || isNewest"
              @click="mode = 'restore'"
            >
              <span class="mdi mdi-history" />{{ t("versions.compare.restore") }}
            </button>
          </template>
        </footer>
      </section>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { onKeyStroke } from "@vueuse/core";
import { computed, ref, toRef, watch } from "vue";
import { useI18n } from "vue-i18n";

import { useVersionLines } from "@/composables/versions/useVersionLines";
import type { Version, VersionsView } from "@/services/versionsService";
import { useMessagesStore } from "@/stores/messagesStore";
import { useToastStore } from "@/stores/toastStore";
import { useVersionsStore } from "@/stores/versionsStore";
import type { Entry } from "@/types/entry";
import { alignLines } from "@/utils/versions/compareLines";

import VersionCompareRows from "./VersionCompareRows.vue";
import VersionNameControl from "./VersionNameControl.vue";
import VersionPicker from "./VersionPicker.vue";

/** Only shown for a moment while a version that just dropped out is still open. */
const NO_VERSION: Version = { id: "", at: new Date(0).toISOString(), source: "base", config: {} };
const SHOWS = ["sideBySide", "changesOnly"] as const;
type Mode = "view" | "prev" | "restore";

const props = defineProps<{ entry: Entry; view: VersionsView; versionId: string }>();
const emit = defineEmits<{ pick: [versionId: string]; close: [] }>();

const { t } = useI18n();
const versions = useVersionsStore();
const toasts = useToastStore();
const messages = useMessagesStore();
const { linesFor, labelOf, summaryOf } = useVersionLines({ entry: toRef(props, "entry") });

const show = ref<(typeof SHOWS)[number]>("sideBySide");
const mode = ref<Mode>("view");
const isBusy = ref(false);
watch(
  () => props.versionId,
  () => (mode.value = mode.value === "prev" ? "view" : mode.value),
);
onKeyStroke("Escape", () => emit("close"));

const index = computed(() => props.view.versions.findIndex((item) => item.id === props.versionId));
const version = computed((): Version => props.view.versions[index.value] ?? NO_VERSION);
const previous = computed((): Version | null => props.view.versions[index.value - 1] ?? null);
const newest = computed((): Version => props.view.versions.at(-1) ?? NO_VERSION);
const isNewest = computed(() => version.value.id === newest.value.id);

/** Always in time order: the older version left, the newer (or "Jetzt") right (owner rule). */
const rows = computed(() => {
  if (mode.value === "prev" && previous.value) {
    return alignLines({
      older: linesFor(previous.value.config),
      newer: linesFor(version.value.config),
    });
  }
  return alignLines({
    older: linesFor(version.value.config),
    newer: linesFor(newest.value.config),
  });
});
const diffCount = computed(() => rows.value.filter((row) => row.change !== "same").length);

const sides = computed(() => {
  if (mode.value === "prev" && previous.value) {
    return {
      olderTitle: `${t("versions.compare.before")} · ${labelOf(previous.value)}`,
      newerTitle: `${t("versions.compare.after")} · ${labelOf(version.value)}`,
      olderSide: t("versions.compare.before"),
      newerSide: t("versions.compare.after"),
      onlyOld: t("versions.compare.removed"),
      onlyNew: t("versions.compare.added"),
    };
  }
  const isRestore = mode.value === "restore";
  return {
    olderTitle: labelOf(version.value) + (isRestore ? ` · ${t("versions.compare.isFetched")}` : ""),
    newerTitle: t("versions.compare.now"),
    olderSide: isRestore ? t("versions.compare.isFetchedShort") : t("versions.compare.past"),
    newerSide: t("versions.compare.nowShort"),
    onlyOld: isRestore ? t("versions.compare.comesBack") : t("versions.compare.onlyThen"),
    onlyNew: isRestore ? t("versions.compare.goesAway") : t("versions.compare.onlyNow"),
  };
});

const title = computed(() => {
  if (mode.value === "prev")
    return t("versions.compare.titlePrev", { when: labelOf(version.value) });
  const name = t("versions.compare.titleVersion", { label: labelOf(version.value) });
  return mode.value === "restore" ? t("versions.compare.titleRestore", { name }) : name;
});
const subtitle = computed(() => {
  const who = version.value.user ? ` · ${version.value.user.name}` : "";
  const source = t(`versions.source.${version.value.source}`);
  // The starting point says so already; no "Ausgangsstand · Ausgangsstand".
  if (version.value.source === "base") return source + who;
  const summary = summaryOf({ versions: props.view.versions, index: index.value });
  return `${source}${who} · ${summary}`;
});

async function nameVersion(name: string | null): Promise<void> {
  try {
    await versions.name({ versionId: version.value.id, name });
    if (name) toasts.show({ text: t("versions.named", { name }) });
  } catch (error) {
    toasts.show({
      text: messages.textFor({ error, fallback: t("errors.actionFailed") }),
      tone: "error",
    });
  }
}

async function restore(): Promise<void> {
  isBusy.value = true;
  try {
    const restored = await versions.restore(version.value.id);
    const renamed = restored?.renamed ?? [];
    const list = renamed.map((item) => `${item.from} → ${item.to}`).join(", ");
    const text = list ? t("versions.restoredRenamed", { list }) : t("versions.restored");
    toasts.show({ text });
    emit("close");
  } catch (error) {
    toasts.show({
      text: messages.textFor({ error, fallback: t("errors.actionFailed") }),
      tone: "error",
    });
  } finally {
    isBusy.value = false;
  }
}
</script>

<style scoped>
.version-dialog {
  position: fixed;
  inset: 0;
  z-index: 110;
  display: grid;
  place-items: center;
  padding: 20px max(16px, env(safe-area-inset-right, 0px)) 20px
    max(16px, env(safe-area-inset-left, 0px));
  background: var(--scrim);
}

/* Fixed size (owner rule): switching views never resizes it; the body scrolls, the footer stays. */
.version-dialog__panel {
  display: flex;
  flex-direction: column;
  width: min(920px, 100%);
  height: min(640px, 100%);
  overflow: hidden;
  padding: 20px 22px 0;
  border-radius: 16px;
  background: var(--surface);
  box-shadow: var(--shadow);
}

.version-dialog__head {
  position: relative;
  flex: none;
}

.version-dialog__head h2 {
  margin: 0 32px 4px 0;
  font: 700 19px/1.25 var(--font-display);
}

.version-dialog__head p,
.version-dialog__bar,
.version-dialog__same,
.version-dialog__keep {
  margin: 0;
  color: var(--muted);
  font-size: 12.5px;
}

.version-dialog__x {
  position: absolute;
  top: -4px;
  right: -6px;
}

.version-dialog__bar {
  display: flex;
  flex: none;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px 12px;
  margin: 12px 0 10px;
}

.version-dialog__seg {
  display: flex;
  gap: 2px;
  padding: 3px;
  border-radius: 9px;
  background: var(--sunken);
}

.version-dialog__seg button {
  padding: 4px 9px;
  border: 0;
  border-radius: 7px;
  background: transparent;
  color: var(--muted);
  font-size: 12.5px;
  font-weight: 600;
  cursor: pointer;
}

.version-dialog__seg button.is-on {
  background: var(--surface);
  color: var(--fg);
}

.version-dialog__spacer {
  flex: 1;
}

.version-dialog__body {
  display: grid;
  flex: 1;
  align-content: start;
  gap: 10px;
  min-height: 0;
  overflow: auto;
}

.version-dialog__foot {
  display: flex;
  flex: none;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
  margin: 0 -22px;
  padding: 12px 22px 16px;
  border-top: 1px solid var(--line);
}
</style>
