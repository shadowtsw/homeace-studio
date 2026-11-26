<template>
  <div class="run-overlay" role="status">
    <span class="run-overlay__dot" :class="`run-overlay__dot--${tone}`">
      <span class="mdi" :class="icon" />
    </span>
    <span class="run-overlay__text">
      <b>{{ t("history.overlay.title", { when }) }}</b>
      · {{ t(`history.result.${run.result}`) }}. {{ t("history.overlay.text") }}
    </span>
    <button class="btn" type="button" @click="emit('toHistory')">
      <span class="mdi mdi-history" />{{ t("history.overlay.toHistory") }}
    </button>
    <button class="btn run-overlay__hide" type="button" @click="emit('hide')">
      <span class="mdi mdi-close" />{{ t("history.overlay.hide") }}
    </button>
  </div>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { useI18n } from "vue-i18n";

import type { Run } from "@/services/tracesService";
import { useSettingsStore } from "@/stores/settingsStore";
import { clockTime, dayLabel } from "@/utils/runs/runTime";

/** Above the flow while a run is shown on its blocks. */
const props = defineProps<{ run: Run }>();

const emit = defineEmits<{
  toHistory: [];
  hide: [];
}>();

const { t } = useI18n();
const settings = useSettingsStore();

const when = computed(() => {
  const day = dayLabel(props.run.startedAt, new Date(), settings.locale, {
    today: t("history.today"),
    yesterday: t("history.yesterday"),
  });
  return `${day}, ${clockTime(props.run.startedAt, settings.locale)}`;
});

const tone = computed(() => {
  const result = props.run.result;
  if (result === "finished") return "ok";
  if (result === "conditionsFailed") return "warn";
  if (result === "error") return "err";
  if (result === "running") return "run";
  return "none";
});

const icon = computed(() => (tone.value === "ok" ? "mdi-check" : "mdi-history"));
</script>

<style scoped>
.run-overlay {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 10px;
  margin-bottom: 14px;
  padding: 10px 14px;
  border-radius: 12px;
  background: var(--accent-soft);
  font-size: 13px;
}

.run-overlay__text {
  flex: 1;
  min-width: 180px;
}

.run-overlay .btn {
  gap: 6px;
}

.run-overlay__hide {
  border-color: transparent;
  background: transparent;
}

.run-overlay__dot {
  display: grid;
  flex: none;
  place-items: center;
  width: 24px;
  height: 24px;
  border-radius: 50%;
  background: var(--sunken);
  font-size: 14px;
}

.run-overlay__dot--ok {
  background: var(--ok-soft);
  color: var(--ok);
}

.run-overlay__dot--warn {
  background: var(--warn-soft);
  color: var(--warn);
}

.run-overlay__dot--err {
  background: var(--err-soft);
  color: var(--err);
}

.run-overlay__dot--run {
  background: var(--accent-soft);
  color: var(--accent);
}
</style>
