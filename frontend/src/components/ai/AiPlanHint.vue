<template>
  <template v-if="newest">
    <div v-if="!ai.isHintPutOff" class="ai-hint">
      <span class="mdi mdi-creation ai-hint__icon" />
      <div>
        <b>{{ t("ai.hintTitle", { client: clientName(newest) }) }}</b>
        {{
          t(
            "ai.hintText",
            { title: newest.title, count: newest.operations.length },
            newest.operations.length,
          )
        }}
        <template v-if="ai.openPlans.length > 1">
          · {{ t("ai.moreOpen", { count: ai.openPlans.length - 1 }) }}
        </template>
        <div class="ai-hint__buttons">
          <button class="btn btn--primary" type="button" @click="ai.review(newest.id)">
            {{ t("ai.review") }}
          </button>
          <button class="btn ai-hint__later" type="button" @click="ai.putOffHint()">
            {{ t("ai.later") }}
          </button>
        </div>
      </div>
    </div>
    <button v-else class="ai-hint__entry" type="button" @click="ai.review(newest.id)">
      <span class="mdi mdi-creation" />
      <span>{{ t("ai.navEntry") }}</span>
      <span class="ai-hint__badge">{{ ai.openPlans.length }}</span>
    </button>
  </template>
</template>

<script setup lang="ts">
import { computed, watch } from "vue";
import { useI18n } from "vue-i18n";

import type { AiPlan } from "@/services/aiService";
import { useAiStore } from "@/stores/aiStore";
import { useToastStore } from "@/stores/toastStore";

/** Open folder plans from an AI, above the folders; a small entry after "Later". */
const { t } = useI18n();
const ai = useAiStore();
const toasts = useToastStore();

const newest = computed(() => ai.openPlans[0] ?? null);

function clientName(plan: AiPlan): string {
  return plan.client ?? t("ai.someAi");
}

/** The first load brings plans that were already there; only later ones are new. */
let isFirstLoad = true;

// A plan that arrives while the app is open is announced once.
watch(
  () => ai.openPlans.map((plan) => plan.id),
  (ids, previous) => {
    if (isFirstLoad) {
      isFirstLoad = false;
      return;
    }

    const arrived = ai.openPlans.find(
      (plan) => ids.includes(plan.id) && !previous.includes(plan.id),
    );

    if (arrived) toasts.show({ text: t("toast.aiArrived", { client: clientName(arrived) }) });
  },
);
</script>

<style scoped>
.ai-hint {
  display: flex;
  align-items: flex-start;
  gap: 9px;
  margin: 2px 2px 12px;
  padding: 10px 10px 10px 11px;
  border-radius: 10px;
  background: var(--kind-script-soft);
  color: var(--muted);
  font-size: 12.5px;
  line-height: 1.4;
}

.ai-hint b {
  display: block;
  margin-bottom: 1px;
  color: var(--fg);
  font-size: 13px;
}

.ai-hint__icon {
  margin-top: 1px;
  color: var(--kind-script);
  font-size: 18px;
}

.ai-hint__buttons {
  display: flex;
  gap: 4px;
  margin-top: 8px;
}

.ai-hint__buttons .btn {
  height: 28px;
  padding: 0 10px;
  font-size: 12.5px;
}

.ai-hint__later {
  border-color: transparent;
  background: transparent;
}

.ai-hint__entry {
  display: flex;
  align-items: center;
  gap: 9px;
  width: calc(100% - 4px);
  margin: 0 2px 8px;
  padding: 6px 8px;
  border: 0;
  border-radius: 7px;
  background: none;
  color: var(--muted);
  text-align: left;
  cursor: pointer;
}

.ai-hint__entry:hover {
  background: var(--sunken);
  color: var(--fg);
}

.ai-hint__entry span:nth-child(2) {
  flex: 1;
}

.ai-hint__badge {
  display: grid;
  place-items: center;
  min-width: 20px;
  height: 20px;
  padding: 0 6px;
  border-radius: 999px;
  background: var(--accent);
  color: var(--on-accent);
  font-size: 11.5px;
  font-weight: 700;
}
</style>
