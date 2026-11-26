import { ref, type Ref } from "vue";
import { useI18n } from "vue-i18n";

import type { AiPlan } from "@/services/aiService";
import { useAiStore } from "@/stores/aiStore";
import { useMessagesStore } from "@/stores/messagesStore";
import { useToastStore } from "@/stores/toastStore";

type UseAiPlanActionsOptions = {
  plan: Ref<AiPlan>;
  /** HA was changed; the page reloads its data. */
  onApplied: () => void;
};

/** Applying or rejecting an AI's folder plan, with feedback as toasts; closing the review. */
export function useAiPlanActions({ plan, onApplied }: UseAiPlanActionsOptions) {
  const { t } = useI18n();
  const ai = useAiStore();
  const messages = useMessagesStore();
  const toasts = useToastStore();
  const isBusy = ref(false);

  function showError(error: unknown): void {
    toasts.show({
      text: messages.textFor({ error, fallback: t("errors.actionFailed") }),
      tone: "error",
    });
  }

  async function apply(operationIds: string[]): Promise<void> {
    isBusy.value = true;

    try {
      const result = await ai.apply({ planId: plan.value.id, operationIds });
      toasts.show({
        text: t("toast.aiApplied", { count: result.appliedCount }, result.appliedCount),
      });

      if (result.failed.length) {
        toasts.show({
          text: t("toast.aiFailed", { count: result.failed.length }, result.failed.length),
          tone: "error",
        });
      }

      ai.closeReview();
      onApplied();
    } catch (error) {
      showError(error);
    } finally {
      isBusy.value = false;
    }
  }

  async function reject(): Promise<void> {
    isBusy.value = true;

    try {
      await ai.reject(plan.value.id);
      toasts.show({ text: t("toast.aiRejected") });
      ai.closeReview();
    } catch (error) {
      showError(error);
    } finally {
      isBusy.value = false;
    }
  }

  function close(): void {
    if (!isBusy.value) ai.closeReview();
  }

  return { isBusy, apply, reject, close };
}
