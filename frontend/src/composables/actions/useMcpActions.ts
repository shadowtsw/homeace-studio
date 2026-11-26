import { ref, type Ref } from "vue";
import { useI18n } from "vue-i18n";

import { useAiStore } from "@/stores/aiStore";
import { useMessagesStore } from "@/stores/messagesStore";
import { useToastStore } from "@/stores/toastStore";
import { copyText } from "@/utils/aiPlan";

/**
 * The AI access with feedback as toasts: switching it on and off, a new token (shown right away),
 * and copying the address or the setup for a client.
 */
export function useMcpActions({ isTokenShown }: { isTokenShown: Ref<boolean> }) {
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

  async function setEnabled(isEnabled: boolean): Promise<void> {
    isBusy.value = true;
    try {
      await ai.setEnabled(isEnabled);
      toasts.show({ text: isEnabled ? t("toast.mcpOn") : t("toast.mcpOff") });
    } catch (error) {
      showError(error);
    } finally {
      isBusy.value = false;
    }
  }

  async function renew(): Promise<void> {
    isBusy.value = true;
    try {
      await ai.renewToken();
      isTokenShown.value = true;
      toasts.show({ text: t("toast.mcpRenewed") });
    } catch (error) {
      showError(error);
    } finally {
      isBusy.value = false;
    }
  }

  async function copy(text: string): Promise<void> {
    toasts.show({ text: (await copyText(text)) ? t("toast.copied") : t("toast.copyFailed") });
  }

  return { isBusy, setEnabled, renew, copy };
}
