<template>
  <section class="checkup-list">
    <div class="checkup-list__head">
      <button
        class="icon-btn checkup-list__nav-toggle"
        type="button"
        :aria-label="t('nav.open')"
        @click="emit('openNav')"
      >
        <span class="mdi mdi-menu" />
      </button>
      <div>
        <h2>{{ t("checkup.title") }}</h2>
        <div class="checkup-list__subtitle">{{ t("checkup.subtitle") }}</div>
      </div>
    </div>

    <div class="checkup-list__body">
      <p v-if="!checkup.hasLoaded" class="checkup-list__empty">{{ t("checkup.loading") }}</p>

      <div v-else-if="checkup.findings.length === 0" class="checkup-list__fine">
        <span class="mdi mdi-check-circle-outline" />
        <b>{{ t("checkup.allFine") }}</b>
        {{ t("checkup.allFineText") }}
      </div>

      <template v-for="group in groups" :key="group.kind">
        <div class="checkup-list__group">
          <span class="mdi" :class="KIND_ICON[group.kind]" />
          {{ t(`checkup.kinds.${group.kind}`) }}
          <span class="checkup-list__line" />
          <span class="checkup-list__count">{{ group.findings.length }}</span>
        </div>
        <p class="checkup-list__hint">{{ t(`checkup.hints.${group.kind}`) }}</p>

        <div
          v-for="finding in group.findings"
          :key="finding.key"
          class="checkup-list__row"
          :class="{ 'checkup-list__row--active': finding.entityId === selectedEntityId }"
        >
          <button
            class="checkup-list__open"
            type="button"
            @click="emit('select', finding.entityId)"
          >
            <span class="checkup-list__icon" :class="`kind-${finding.entryKind}`">
              <span class="mdi" :class="ENTRY_KIND_ICON[finding.entryKind]" />
            </span>
            <span class="checkup-list__main">
              <b>{{ finding.name }}</b>
              <span class="checkup-list__why">{{ reason(finding) }}</span>
              <span v-if="finding.refs.length" class="checkup-list__refs">
                <span
                  v-for="ref in finding.refs"
                  :key="ref.entityId"
                  class="checkup-list__ref"
                  :class="{ 'checkup-list__ref--gone': finding.kind === 'gone' }"
                >
                  {{ ref.name ?? ref.entityId }}
                </span>
              </span>
            </span>
          </button>
          <button
            class="icon-btn"
            type="button"
            :title="t('checkup.ignoreTitle')"
            :aria-label="t('checkup.ignoreTitle')"
            @click="ignore(finding.key)"
          >
            <span class="mdi mdi-eye-off-outline" />
          </button>
        </div>
      </template>

      <CheckupTrash @select="(id) => emit('select', id)" />

      <div v-if="checkup.ignoredCount" class="checkup-list__hidden">
        <span class="mdi mdi-eye-off-outline" />
        {{ t("checkup.hidden", { count: checkup.ignoredCount }) }}
        <button class="btn" type="button" @click="restore">{{ t("checkup.showHidden") }}</button>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, onMounted } from "vue";
import { useI18n } from "vue-i18n";

import { ENTRY_KIND_ICON } from "@/constants/entries";
import { CHECKUP_KINDS, type CheckupFinding, type CheckupKind } from "@/services/checkupService";
import { useCheckupStore } from "@/stores/checkupStore";
import { useMessagesStore } from "@/stores/messagesStore";
import { useToastStore } from "@/stores/toastStore";
import { relativeTime } from "@/utils/runs/relativeTime";

import CheckupTrash from "./CheckupTrash.vue";

/** The check-up view in the list column: findings grouped by kind; a click opens the entry. */
defineProps<{
  selectedEntityId: string | null;
}>();

const emit = defineEmits<{
  select: [entityId: string];
  openNav: [];
}>();

const KIND_ICON: Record<CheckupKind, string> = {
  gone: "mdi-link-variant-off",
  unavailable: "mdi-wifi-off",
  failed: "mdi-alert-circle-outline",
  unused: "mdi-cancel",
  stale: "mdi-clock-outline",
};

const { t, locale } = useI18n();
const checkup = useCheckupStore();
const messages = useMessagesStore();
const toasts = useToastStore();

const groups = computed(() =>
  CHECKUP_KINDS.map((kind) => ({
    kind,
    findings: checkup.findings.filter((finding) => finding.kind === kind),
  })).filter((group) => group.findings.length > 0),
);

function reason(finding: CheckupFinding): string {
  switch (finding.kind) {
    case "gone":
      return t("checkup.rows.gone");
    case "unavailable":
      return t("checkup.rows.unavailable");
    case "failed":
      return finding.failedAt
        ? t("checkup.rows.failed", {
            time: relativeTime({ iso: finding.failedAt, now: new Date(), locale: locale.value }),
          })
        : t("checkup.kinds.failed");
    case "unused":
      return t("checkup.rows.unused");
    case "stale": {
      const when = finding.lastTriggered
        ? t("checkup.rows.lastRun", {
            time: relativeTime({
              iso: finding.lastTriggered,
              now: new Date(),
              locale: locale.value,
            }),
          })
        : t("checkup.rows.never");
      return finding.isOn ? when : `${when} · ${t("checkup.rows.off")}`;
    }
  }
}

function showError(error: unknown): void {
  toasts.show({
    text: messages.textFor({ error, fallback: t("errors.actionFailed") }),
    tone: "error",
  });
}

async function ignore(key: string): Promise<void> {
  try {
    await checkup.ignore(key);
    toasts.show({ text: t("toast.findingIgnored") });
  } catch (error) {
    showError(error);
  }
}

async function restore(): Promise<void> {
  try {
    await checkup.restore();
  } catch (error) {
    showError(error);
  }
}

// Opening the view checks again, so it always shows the current state.
onMounted(() => void checkup.load());
</script>

<style scoped>
.checkup-list {
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 0;
}

.checkup-list__head {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  padding: 14px 16px 12px;
  border-bottom: 1px solid var(--line);
}

.checkup-list__head h2 {
  margin: 0;
  font: 700 22px/1.15 var(--font-display);
  letter-spacing: -0.015em;
}

.checkup-list__subtitle {
  margin-top: 3px;
  color: var(--muted);
  font-size: 12.5px;
}

.checkup-list__nav-toggle {
  display: none;
}

.checkup-list__body {
  flex: 1;
  overflow: auto;
  padding: 6px 10px 30px;
}

.checkup-list__empty {
  padding: 40px 20px;
  color: var(--muted);
  text-align: center;
}

.checkup-list__fine {
  display: grid;
  justify-items: center;
  gap: 4px;
  padding: 44px 20px;
  color: var(--muted);
  text-align: center;
}

.checkup-list__fine .mdi {
  color: var(--ok);
  font-size: 40px;
}

.checkup-list__fine b {
  color: var(--fg);
  font-size: 16px;
}

.checkup-list__group {
  display: flex;
  align-items: center;
  gap: 6px;
  margin: 14px 6px 2px;
  color: var(--muted);
  font-size: 12px;
  font-weight: 600;
}

.checkup-list__group .mdi {
  color: var(--faint);
  font-size: 15px;
}

.checkup-list__line {
  flex: 1;
  height: 1px;
  background: var(--line);
}

.checkup-list__count {
  color: var(--faint);
  font-weight: 500;
}

.checkup-list__hint {
  margin: 0 6px 6px;
  color: var(--faint);
  font-size: 11.5px;
}

.checkup-list__row {
  display: flex;
  align-items: center;
  gap: 4px;
  padding-right: 6px;
  border: 1px solid transparent;
  border-radius: var(--radius-md);
}

.checkup-list__row:hover {
  background: var(--surface);
}

.checkup-list__row--active {
  border-color: var(--line-strong);
  background: var(--surface);
}

.checkup-list__open {
  flex: 1;
  min-width: 0;
  display: flex;
  align-items: flex-start;
  gap: 10px;
  padding: 9px 0 9px 10px;
  border: 0;
  background: none;
  text-align: left;
  cursor: pointer;
}

.checkup-list__icon {
  display: grid;
  place-items: center;
  flex: none;
  width: 32px;
  height: 32px;
  border-radius: 8px;
  font-size: 18px;
}

.checkup-list__main {
  display: grid;
  gap: 2px;
  min-width: 0;
}

.checkup-list__why {
  color: var(--faint);
  font-size: 11.5px;
}

.checkup-list__refs {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  margin-top: 2px;
}

.checkup-list__ref {
  padding: 1px 7px;
  border-radius: 999px;
  background: var(--warn-soft);
  color: var(--warn);
  font-size: 11.5px;
  font-weight: 600;
  overflow-wrap: anywhere;
}

.checkup-list__ref--gone {
  background: var(--err-soft);
  color: var(--err);
}

.checkup-list__hidden {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px;
  margin: 16px 6px;
  color: var(--muted);
  font-size: 12.5px;
}

@media (max-width: 1180px) {
  .checkup-list__nav-toggle {
    display: inline-grid;
  }
}
</style>
