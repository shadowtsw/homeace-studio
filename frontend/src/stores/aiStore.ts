import { defineStore } from "pinia";
import { computed, ref } from "vue";

import {
  applyAiPlan,
  fetchAiPlans,
  fetchMcp,
  rejectAiPlan,
  renewMcpToken,
  setMcpEnabled,
  type AiPlan,
  type ApplyResult,
  type McpOverview,
} from "@/services/aiService";

/**
 * AI access over MCP and the folder plans an AI sent. Plans arrive any time; the live updates
 * reload them.
 */
export const useAiStore = defineStore("ai", () => {
  const mcp = ref<McpOverview | null>(null);
  const plans = ref<AiPlan[]>([]);
  /** The plan in the review dialog; null when closed. */
  const reviewPlanId = ref<string | null>(null);
  /** "Later" on the hint: it shrinks to a small entry until the page is loaded again. */
  const isHintPutOff = ref(false);

  const openPlans = computed(() => plans.value.filter((plan) => plan.status === "open"));
  const reviewPlan = computed(
    () => plans.value.find((plan) => plan.id === reviewPlanId.value) ?? null,
  );

  async function loadPlans(): Promise<void> {
    try {
      plans.value = await fetchAiPlans();
    } catch (error) {
      console.error("Loading AI plans failed", error);
    }
  }

  async function loadMcp(): Promise<void> {
    mcp.value = await fetchMcp();
  }

  /** Errors go to the caller, which shows them. */
  async function setEnabled(isEnabled: boolean): Promise<void> {
    mcp.value = await setMcpEnabled(isEnabled);
  }

  async function renewToken(): Promise<void> {
    mcp.value = await renewMcpToken();
  }

  function review(planId: string): void {
    reviewPlanId.value = planId;
  }

  function closeReview(): void {
    reviewPlanId.value = null;
  }

  async function apply(planId: string, operationIds: string[]): Promise<ApplyResult> {
    const result = await applyAiPlan(planId, operationIds);
    await loadPlans();

    return result;
  }

  async function reject(planId: string): Promise<void> {
    await rejectAiPlan(planId);
    await loadPlans();
  }

  return {
    mcp,
    plans,
    openPlans,
    reviewPlan,
    isHintPutOff,
    loadPlans,
    loadMcp,
    setEnabled,
    renewToken,
    review,
    closeReview,
    apply,
    reject,
    putOffHint: () => (isHintPutOff.value = true),
  };
});
