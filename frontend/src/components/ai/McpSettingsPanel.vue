<template>
  <div class="mcp">
    <p class="mcp__intro">{{ t("ai.intro") }}</p>
    <p v-if="!mcp" class="mcp__intro">{{ t("ai.loading") }}</p>

    <template v-else>
      <ol class="mcp__steps">
        <li class="mcp__step" :class="{ 'mcp__step--done': isPortOpen }">
          <b>{{ t("ai.stepPort") }}</b>
          <small v-if="!mcp.isAddon">{{ t("ai.portLocal", { port: mcp.hostPort }) }}</small>
          <small v-else-if="isPortOpen">{{ t("ai.portOpen", { port: mcp.hostPort }) }}</small>
          <small v-else>{{ t("ai.portClosed") }}</small>
        </li>

        <li
          class="mcp__step"
          :class="{ 'mcp__step--done': mcp.isEnabled, 'mcp__step--off': !isPortOpen }"
        >
          <b>{{ t("ai.stepSwitch") }}</b>
          <div class="mcp__switch">
            <SwitchToggle
              :model-value="mcp.isEnabled"
              :label="t('ai.switchLabel')"
              :disabled="isBusy"
              @update:model-value="setEnabled"
            />
            <span>{{ mcp.isEnabled ? t("ai.on") : t("ai.off") }}</span>
            <span v-if="mcp.isEnabled" class="mcp__muted">· {{ connectionText }}</span>
          </div>
        </li>

        <li class="mcp__step" :class="{ 'mcp__step--off': !mcp.isEnabled || !url }">
          <b>{{ t("ai.stepClient") }}</b>
          <div class="mcp__tabs" role="tablist">
            <button
              v-for="client in CLIENTS"
              :key="client"
              type="button"
              role="tab"
              :aria-selected="selectedClient === client"
              :class="{ 'mcp__tab--on': selectedClient === client }"
              @click="selectedClient = client"
            >
              {{ t(`ai.clients.${client}`) }}
            </button>
          </div>
          <pre class="mcp__code">{{ shownSnippet }}</pre>
          <div>
            <button class="btn" type="button" :disabled="!canCopy" @click="copy(fullSnippet)">
              <span class="mdi mdi-content-copy" />{{ t("ai.copy") }}
            </button>
          </div>
          <small>{{ t("ai.tokenHint") }}</small>
          <div class="mcp__token">
            <code>{{ shownToken }}</code>
            <button
              class="btn mcp__ghost"
              type="button"
              :disabled="!mcp.token"
              @click="isTokenShown = !isTokenShown"
            >
              {{ isTokenShown ? t("ai.hide") : t("ai.show") }}
            </button>
            <button
              class="btn mcp__ghost"
              type="button"
              :disabled="!mcp.token"
              @click="copy(mcp.token ?? '')"
            >
              {{ t("ai.copy") }}
            </button>
            <button
              class="btn mcp__ghost"
              type="button"
              :disabled="!mcp.token || isBusy"
              @click="renew"
            >
              {{ t("ai.renew") }}
            </button>
          </div>
        </li>
      </ol>

      <McpAccessRules />
    </template>
  </div>
</template>

<script setup lang="ts">
import { storeToRefs } from "pinia";
import { computed, onMounted, ref } from "vue";
import { useI18n } from "vue-i18n";

import SwitchToggle from "@/components/common/SwitchToggle.vue";
import { useAiStore } from "@/stores/aiStore";
import { useMessagesStore } from "@/stores/messagesStore";
import { useToastStore } from "@/stores/toastStore";
import {
  MCP_CLIENT,
  copyText,
  maskToken,
  mcpSnippet,
  mcpUrl,
  type McpClient,
} from "@/utils/aiPlan";

import McpAccessRules from "./McpAccessRules.vue";

/**
 * The AI access, as a tab of the settings window: open the port, switch on, add the address and
 * token to an AI client.
 */
const CLIENTS: McpClient[] = [MCP_CLIENT.claudeCode, MCP_CLIENT.json];
const TOKEN_PLACEHOLDER = "<TOKEN>";

const { t, locale } = useI18n();
const ai = useAiStore();
const { mcp } = storeToRefs(ai);
const messages = useMessagesStore();
const toasts = useToastStore();

// Fresh on every open: the port or the last connection may have changed meanwhile.
onMounted(() => {
  void ai.loadMcp().catch((error: unknown) => console.error("Loading MCP access failed", error));
});

const isBusy = ref(false);
const isTokenShown = ref(false);
const selectedClient = ref<McpClient>(MCP_CLIENT.claudeCode);

const isPortOpen = computed(() => mcp.value?.hostPort != null);
const url = computed(() =>
  mcp.value ? mcpUrl({ overview: mcp.value, hostname: window.location.hostname }) : null,
);
const shownToken = computed(() => {
  const token = mcp.value?.token;
  if (!token) return TOKEN_PLACEHOLDER;
  return isTokenShown.value ? token : maskToken(token);
});
const canCopy = computed(() => Boolean(url.value && mcp.value?.token));
const fullSnippet = computed(() =>
  mcpSnippet({
    client: selectedClient.value,
    url: url.value ?? "",
    token: mcp.value?.token ?? TOKEN_PLACEHOLDER,
  }),
);
const shownSnippet = computed(() =>
  mcpSnippet({
    client: selectedClient.value,
    url: url.value ?? "http://…/mcp",
    token: shownToken.value,
  }),
);

const connectionText = computed(() => {
  const last = mcp.value?.lastConnection;
  if (!last) return t("ai.neverConnected");

  const time = new Date(last.at).toLocaleString(locale.value, {
    dateStyle: "short",
    timeStyle: "short",
  });
  return last.client
    ? t("ai.lastConnectionClient", { time, client: last.client })
    : t("ai.lastConnection", { time });
});

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
</script>

<style scoped>
.mcp {
  display: grid;
  gap: 12px;
}

.mcp__intro {
  margin: 0;
  color: var(--muted);
  font-size: 13.5px;
}

.mcp__steps {
  display: grid;
  gap: 10px;
  margin: 0;
  padding: 0;
  list-style: none;
  counter-reset: mcp-step;
}

.mcp__step {
  display: grid;
  gap: 8px;
  position: relative;
  padding: 12px 14px 12px 52px;
  border: 1px solid var(--line);
  border-radius: 12px;
  background: var(--surface-2);
}

.mcp__step::before {
  content: counter(mcp-step);
  counter-increment: mcp-step;
  position: absolute;
  top: 11px;
  left: 14px;
  display: grid;
  place-items: center;
  width: 26px;
  height: 26px;
  border-radius: 50%;
  background: var(--sunken);
  color: var(--muted);
  font-size: 13px;
  font-weight: 700;
}

.mcp__step--done::before {
  content: "✓";
  background: var(--ok-soft);
  color: var(--ok);
}

.mcp__step--off {
  opacity: 0.55;
}

.mcp__step b {
  font-size: 14px;
}

.mcp__step small,
.mcp__muted {
  color: var(--muted);
  font-size: 12.5px;
  line-height: 1.45;
}

.mcp__switch {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 10px;
  font-size: 13px;
}

.mcp__tabs {
  display: flex;
  justify-self: start;
  gap: 2px;
  padding: 3px;
  border-radius: 9px;
  background: var(--sunken);
}

.mcp__tabs button {
  padding: 5px 10px;
  border: 0;
  border-radius: 7px;
  background: transparent;
  color: var(--muted);
  font-size: 12.5px;
  font-weight: 600;
  cursor: pointer;
}

.mcp__tabs .mcp__tab--on {
  background: var(--surface);
  color: var(--fg);
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.08);
}

.mcp__code {
  margin: 0;
  padding: 10px 12px;
  border-radius: 9px;
  background: var(--fg);
  color: var(--bg);
  font: 12px/1.5 var(--font-mono);
  white-space: pre-wrap;
  word-break: break-all;
}

.mcp__token {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px;
}

.mcp__token code {
  flex: 1 1 220px;
  min-width: 0;
  padding: 6px 9px;
  border: 1px solid var(--line);
  border-radius: 7px;
  background: var(--surface);
  font-family: var(--font-mono);
  font-size: 12px;
  word-break: break-all;
}

.mcp__ghost {
  border-color: transparent;
  background: transparent;
}
</style>
