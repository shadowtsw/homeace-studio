<template>
  <div class="checkup-banner">
    <div
      v-for="finding in findings"
      :key="finding.key"
      class="checkup-banner__item"
      :class="{ 'checkup-banner__item--gone': finding.kind === 'gone' }"
      role="status"
    >
      <div class="checkup-banner__head">
        <span class="mdi" :class="KIND_ICON[finding.kind]" />
        {{ t(`checkup.kinds.${finding.kind}`) }}
      </div>
      <p>{{ text(finding) }}</p>
      <small v-if="finding.kind === 'unused'">{{ t("checkup.banner.unusedNote") }}</small>
      <div class="checkup-banner__buttons">
        <button
          v-if="finding.kind === 'gone' && hasFlow"
          class="btn btn--primary"
          type="button"
          @click="emit('showFlow')"
        >
          {{ t("checkup.banner.showFlow") }}
        </button>
        <button
          v-if="finding.kind === 'failed' && hasFlow"
          class="btn btn--primary"
          type="button"
          @click="emit('showHistory')"
        >
          {{ t("checkup.banner.showHistory") }}
        </button>
        <button
          v-if="finding.kind === 'stale' && finding.isOn"
          class="btn"
          type="button"
          :disabled="isBusy"
          @click="emit('turnOff')"
        >
          {{ t("checkup.banner.turnOff") }}
        </button>
        <button
          v-if="finding.kind === 'unused' || finding.kind === 'stale'"
          class="btn checkup-banner__danger"
          type="button"
          :disabled="isBusy"
          @click="emit('delete')"
        >
          {{ t("checkup.banner.delete") }}
        </button>
        <button
          class="btn checkup-banner__quiet"
          type="button"
          @click="emit('ignore', finding.key)"
        >
          <span class="mdi mdi-eye-off-outline" />{{ t("checkup.ignore") }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useI18n } from "vue-i18n";

import { useRunTexts } from "@/composables/texts/useRunTexts";

import type { CheckupFinding, CheckupKind } from "@/services/checkupService";
import { relativeTime } from "@/utils/runs/relativeTime";

/** What the check-up found about the open entry, with what to do about it. */
defineProps<{
  findings: CheckupFinding[];
  hasFlow: boolean;
  isBusy: boolean;
}>();

const emit = defineEmits<{
  showFlow: [];
  turnOff: [];
  delete: [];
  /** The failed run is in the "Verlauf" tab. */
  showHistory: [];
  ignore: [key: string];
}>();

const KIND_ICON: Record<CheckupKind, string> = {
  gone: "mdi-link-variant-off",
  unavailable: "mdi-wifi-off",
  failed: "mdi-alert-circle-outline",
  unused: "mdi-cancel",
  stale: "mdi-clock-outline",
};

const { t, locale } = useI18n();
const { errorText } = useRunTexts();

function text(finding: CheckupFinding): string {
  const now = new Date();

  switch (finding.kind) {
    case "gone":
      return t("checkup.banner.gone", { ids: finding.refs.map((ref) => ref.entityId).join(", ") });
    case "unavailable": {
      const since = finding.refs[0]?.since;
      return t("checkup.banner.unavailable", {
        names: finding.refs.map((ref) => ref.name ?? ref.entityId).join(", "),
        since: since ? relativeTime({ iso: since, now, locale: locale.value }) : "?",
      });
    }
    case "failed":
      return t("checkup.banner.failed", {
        time: finding.failedAt
          ? relativeTime({ iso: finding.failedAt, now, locale: locale.value })
          : "?",
        error: finding.error ? errorText(finding.error) : "",
      });
    case "unused":
      return t("checkup.banner.unused");
    case "stale": {
      const when = finding.lastTriggered
        ? t("checkup.banner.stale", {
            time: relativeTime({ iso: finding.lastTriggered, now, locale: locale.value }),
          })
        : t("checkup.banner.staleNever");
      return `${when} ${finding.isOn ? t("checkup.banner.stillNeeded") : t("checkup.banner.isOff")}`;
    }
  }
}
</script>

<style scoped>
.checkup-banner {
  display: grid;
  gap: 8px;
  padding: 12px 22px 0;
}

.checkup-banner__item {
  display: grid;
  gap: 6px;
  padding: 12px 14px;
  border: 1px solid color-mix(in srgb, var(--warn) 45%, var(--line));
  border-radius: 12px;
  background: var(--warn-soft);
}

.checkup-banner__item--gone {
  border-color: color-mix(in srgb, var(--err) 45%, var(--line));
  background: var(--err-soft);
}

.checkup-banner__head {
  display: flex;
  align-items: center;
  gap: 8px;
  font-weight: 700;
}

.checkup-banner__head .mdi {
  color: var(--warn);
  font-size: 18px;
}

.checkup-banner__item--gone .checkup-banner__head .mdi {
  color: var(--err);
}

.checkup-banner p {
  margin: 0;
  font-size: 13px;
}

.checkup-banner small {
  color: var(--muted);
  font-size: 12px;
}

.checkup-banner__buttons {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.checkup-banner__buttons .btn {
  height: 30px;
  padding: 0 10px;
  font-size: 12.5px;
}

.checkup-banner__danger {
  border-color: var(--err);
  color: var(--err);
}

.checkup-banner__quiet {
  border-color: transparent;
  background: transparent;
}
</style>
