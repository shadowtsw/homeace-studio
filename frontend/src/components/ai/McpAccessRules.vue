<template>
  <div class="mcp-rules">
    <div>
      <b><span class="mdi mdi-check-circle-outline mcp-rules__yes" />{{ t("ai.canTitle") }}</b>
      <ul>
        <li>{{ t("ai.can1") }}</li>
        <li>{{ t("ai.can2") }}</li>
        <li>{{ t("ai.can3") }}</li>
      </ul>
    </div>
    <div>
      <b><span class="mdi mdi-cancel mcp-rules__no" />{{ t("ai.cannotTitle") }}</b>
      <ul>
        <li>{{ t("ai.cannot1") }}</li>
        <li>{{ t("ai.cannot2") }}</li>
        <li>{{ t("ai.cannot3") }}</li>
      </ul>
    </div>
  </div>

  <div v-if="ai.openPlans.length" class="mcp-plans">
    <b>{{ t("ai.openPlans") }}</b>
    <button v-for="plan in ai.openPlans" :key="plan.id" type="button" @click="openPlan(plan.id)">
      <span class="mdi mdi-creation" />
      <span>{{ plan.title }}</span>
      <span class="mcp-plans__count">{{
        t("ai.changes", { count: plan.operations.length }, plan.operations.length)
      }}</span>
    </button>
  </div>

  <p v-if="settings.isTechnicalDetailsVisible" class="mcp-tech">{{ t("ai.tools") }}</p>
</template>

<script setup lang="ts">
import { useI18n } from "vue-i18n";

import { useAiStore } from "@/stores/aiStore";
import { useSettingsStore } from "@/stores/settingsStore";
import { useSettingsWindowStore } from "@/stores/settingsWindowStore";

/** What an AI may and may not do over MCP, and the plans waiting for a review. */
const { t } = useI18n();
const ai = useAiStore();
const settings = useSettingsStore();
const settingsWindow = useSettingsWindowStore();

/** The review is a dialog of its own; the settings window makes room for it. */
function openPlan(planId: string): void {
  settingsWindow.close();
  ai.review(planId);
}
</script>

<style scoped>
.mcp-rules {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
}

.mcp-rules > div {
  padding: 10px 12px;
  border: 1px solid var(--line);
  border-radius: 10px;
  font-size: 13px;
}

.mcp-rules b {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 6px;
}

.mcp-rules ul {
  display: grid;
  gap: 3px;
  margin: 0;
  padding-left: 18px;
  color: var(--muted);
}

.mcp-rules__yes {
  color: var(--ok);
}

.mcp-rules__no {
  color: var(--err);
}

.mcp-plans {
  display: grid;
  gap: 6px;
}

.mcp-plans button {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 9px 12px;
  border: 1px solid var(--line);
  border-radius: 10px;
  background: var(--surface-2);
  text-align: left;
  cursor: pointer;
}

.mcp-plans button > span:nth-child(2) {
  flex: 1;
  font-weight: 600;
}

.mcp-plans__count {
  color: var(--muted);
  font-size: 12.5px;
}

.mcp-tech {
  margin: 0;
  color: var(--faint);
  font-family: var(--font-mono);
  font-size: 11.5px;
}

@media (max-width: 820px) {
  .mcp-rules {
    grid-template-columns: minmax(0, 1fr);
  }
}
</style>
