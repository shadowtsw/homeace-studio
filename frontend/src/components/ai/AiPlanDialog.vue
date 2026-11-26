<template>
  <DialogFrame
    :title="step === 'preview' ? t('ai.previewTitle') : plan.title"
    is-wide
    @close="close"
    @submit="submit"
  >
    <template v-if="step === 'pick'">
      <div class="plan__from">
        <span class="mdi mdi-creation plan__badge" />
        {{ t("ai.planFrom", { client: plan.client ?? t("ai.someAi"), time: createdText }) }}
      </div>
      <blockquote class="plan__reasoning">
        <b>{{ t("ai.reasoning") }}</b>
        {{ plan.reasoning }}
      </blockquote>
      <p class="plan__intro">
        {{ t("ai.reviewIntro") }}
        <template v-if="staleCount">{{
          t("ai.stale", { count: staleCount }, staleCount)
        }}</template>
      </p>

      <section v-if="renames.length" class="plan__section">
        <h3>
          {{ t("ai.renameTitle") }}<small>{{ renames.length }}</small>
        </h3>
        <div class="plan__list">
          <label
            v-for="op in renames"
            :key="op.id"
            class="plan__row"
            :class="{ 'plan__row--on': selected.has(op.id), 'plan__row--stale': op.state !== 'ok' }"
          >
            <input
              type="checkbox"
              :checked="selected.has(op.id)"
              :disabled="op.state !== 'ok'"
              :aria-label="t('ai.take')"
              @change="toggle(op.id)"
            />
            <span class="plan__main">
              <span class="plan__map">
                <code>{{ op.from }}</code>
                <span class="mdi mdi-arrow-right plan__arrow" />
                <code>{{ op.to }}</code>
              </span>
              <span v-if="op.state !== 'ok'" class="plan__tag">{{ stateText(op) }}</span>
            </span>
          </label>
        </div>
      </section>

      <section v-if="groups.length" class="plan__section">
        <h3>
          {{ t("ai.moveTitle") }}<small>{{ moveCount }}</small>
        </h3>
        <div v-for="group in groups" :key="group.to" class="plan__list">
          <label class="plan__group">
            <input
              type="checkbox"
              :checked="isGroupOn(group)"
              :disabled="!group.operations.some((op) => op.state === 'ok')"
              :aria-label="t('ai.allInto', { path: group.to })"
              @change="toggleGroup(group)"
            />
            <span
              class="mdi"
              :class="
                isNewFolder({ path: group.to, allPaths, plan, selected })
                  ? 'mdi-folder-plus-outline'
                  : 'mdi-folder-outline'
              "
            />
            <span class="plan__group-path">{{ group.to }}</span>
            <span
              v-if="isNewFolder({ path: group.to, allPaths, plan, selected })"
              class="plan__tag plan__tag--new"
            >
              {{ t("ai.newFolder") }}
            </span>
            <span class="plan__count">{{ group.operations.length }}</span>
          </label>
          <label
            v-for="op in group.operations"
            :key="op.id"
            class="plan__row"
            :class="{ 'plan__row--on': selected.has(op.id), 'plan__row--stale': op.state !== 'ok' }"
          >
            <input
              type="checkbox"
              :checked="selected.has(op.id)"
              :disabled="op.state !== 'ok'"
              :aria-label="t('ai.take')"
              @change="toggle(op.id)"
            />
            <span class="plan__main">
              <span class="plan__entry">
                <span class="plan__icon" :class="`kind-${op.kind ?? 'automation'}`">
                  <span class="mdi" :class="ENTRY_KIND_ICON[op.kind ?? 'automation']" />
                </span>
                <b>{{ op.entryName }}</b>
              </span>
              <span class="plan__meta">
                <template v-if="op.state !== 'gone'">
                  {{ t(`kind.${op.kind ?? "automation"}`) }} ·
                  {{
                    op.currentFolder
                      ? t("ai.currentFolder", { path: op.currentFolder })
                      : t("ai.noFolder")
                  }}
                </template>
                <span v-if="op.state !== 'ok'" class="plan__tag">{{ stateText(op) }}</span>
              </span>
            </span>
          </label>
        </div>
      </section>
    </template>

    <template v-else>
      <div class="plan__preview">
        <div v-for="op in chosen" :key="op.id" class="plan__step">
          <span
            class="mdi"
            :class="op.type === 'renameFolder' ? 'mdi-pencil-outline' : 'mdi-folder-move-outline'"
          />
          <div>
            <div class="plan__map">
              <template v-if="op.type === 'renameFolder'">
                <code>{{ op.from }}</code>
              </template>
              <b v-else>{{ op.entryName }}</b>
              <span class="mdi mdi-arrow-right plan__arrow" />
              <code>{{ op.to }}</code>
            </div>
            <small>
              {{ op.type === "renameFolder" ? t("ai.previewRename") : t("ai.previewMove") }}
              <template
                v-if="
                  op.type === 'moveEntry' && isNewFolder({ path: op.to, allPaths, plan, selected })
                "
              >
                {{ t("ai.previewNewFolder") }}
              </template>
            </small>
          </div>
        </div>
      </div>
      <p class="plan__hint">
        <span class="mdi mdi-information-outline" />{{ t("ai.previewHint") }}
      </p>
    </template>

    <template #buttons>
      <span class="plan__summary">
        <template v-if="step === 'preview'">
          {{ t("ai.changes", { count: chosen.length }, chosen.length) }}
        </template>
        <template v-else-if="chosen.length">
          {{ t("ai.selected", { count: chosen.length, total: plan.operations.length }) }}
        </template>
        <template v-else>{{ t("ai.noneSelected") }}</template>
      </span>
      <template v-if="step === 'pick'">
        <button class="btn" type="button" :disabled="isBusy" @click="reject">
          {{ t("ai.reject") }}
        </button>
        <button class="btn" type="button" :disabled="isBusy" @click="close">
          {{ t("ai.later") }}
        </button>
        <button class="btn btn--primary" type="submit" :disabled="chosen.length === 0">
          {{ t("ai.next") }}
        </button>
      </template>
      <template v-else>
        <button class="btn" type="button" :disabled="isBusy" @click="step = 'pick'">
          {{ t("ai.back") }}
        </button>
        <button class="btn btn--primary" type="submit" :disabled="isBusy">
          {{ isBusy ? t("ai.running") : t("ai.apply") }}
        </button>
      </template>
    </template>
  </DialogFrame>
</template>

<script setup lang="ts">
import { computed, ref } from "vue";
import { useI18n } from "vue-i18n";

import DialogFrame from "@/components/common/DialogFrame.vue";
import { ENTRY_KIND_ICON } from "@/constants/entries";
import type { AiOperation, AiPlan } from "@/services/aiService";
import { useAiStore } from "@/stores/aiStore";
import { useMessagesStore } from "@/stores/messagesStore";
import { useToastStore } from "@/stores/toastStore";
import {
  initialSelection,
  isNewFolder,
  moveGroups,
  renamesOf,
  type MoveGroup,
} from "@/utils/aiPlan";

/** Review of a folder plan from an AI: untick lines, preview, apply. Or reject it. */
const props = defineProps<{
  plan: AiPlan;
  allPaths: string[];
}>();

const emit = defineEmits<{
  /** HA was changed; the page reloads its data. */
  applied: [];
}>();

const { t, locale } = useI18n();
const ai = useAiStore();
const messages = useMessagesStore();
const toasts = useToastStore();

const step = ref<"pick" | "preview">("pick");
const selected = ref(initialSelection(props.plan));
const isBusy = ref(false);

const renames = computed(() => renamesOf(props.plan));
const groups = computed(() => moveGroups(props.plan));
const moveCount = computed(() =>
  groups.value.reduce((sum, group) => sum + group.operations.length, 0),
);
const staleCount = computed(() => props.plan.operations.filter((op) => op.state !== "ok").length);
const chosen = computed(() =>
  props.plan.operations.filter((op) => op.state === "ok" && selected.value.has(op.id)),
);
const createdText = computed(() =>
  new Date(props.plan.createdAt).toLocaleString(locale.value, {
    dateStyle: "short",
    timeStyle: "short",
  }),
);

function stateText(op: AiOperation): string {
  if (op.state === "done") return t("ai.doneAlready");
  if (op.state === "gone")
    return op.type === "renameFolder" ? t("ai.goneFolder") : t("ai.goneEntry");
  return op.type === "renameFolder" ? t("ai.conflictRename") : t("ai.conflictMove");
}

function toggle(id: string): void {
  const next = new Set(selected.value);
  if (next.has(id)) next.delete(id);
  else next.add(id);
  selected.value = next;
}

function isGroupOn(group: MoveGroup): boolean {
  const usable = group.operations.filter((op) => op.state === "ok");
  return usable.length > 0 && usable.every((op) => selected.value.has(op.id));
}

function toggleGroup(group: MoveGroup): void {
  const turnOn = !isGroupOn(group);
  const next = new Set(selected.value);

  for (const op of group.operations) {
    if (op.state !== "ok") continue;
    if (turnOn) next.add(op.id);
    else next.delete(op.id);
  }

  selected.value = next;
}

function showError(error: unknown): void {
  toasts.show({
    text: messages.textFor({ error, fallback: t("errors.actionFailed") }),
    tone: "error",
  });
}

async function submit(): Promise<void> {
  if (step.value === "pick") {
    step.value = "preview";
    return;
  }

  isBusy.value = true;

  try {
    const result = await ai.apply({
      planId: props.plan.id,
      operationIds: chosen.value.map((op) => op.id),
    });
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
    emit("applied");
  } catch (error) {
    showError(error);
  } finally {
    isBusy.value = false;
  }
}

async function reject(): Promise<void> {
  isBusy.value = true;

  try {
    await ai.reject(props.plan.id);
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
</script>

<style scoped>
.plan__from {
  display: flex;
  align-items: center;
  gap: 8px;
  color: var(--faint);
  font-size: 11.5px;
  font-weight: 700;
  letter-spacing: 0.07em;
  text-transform: uppercase;
}

.plan__badge {
  display: grid;
  place-items: center;
  width: 28px;
  height: 28px;
  border-radius: 8px;
  background: var(--kind-script-soft);
  color: var(--kind-script);
  font-size: 17px;
}

.plan__reasoning {
  margin: 0;
  padding: 10px 14px;
  border-left: 3px solid var(--kind-script);
  border-radius: 0 10px 10px 0;
  background: var(--surface-2);
  font-size: 13.5px;
  line-height: 1.5;
}

.plan__reasoning b {
  display: block;
  margin-bottom: 3px;
  color: var(--faint);
  font-size: 11.5px;
  letter-spacing: 0.07em;
  text-transform: uppercase;
}

.plan__intro {
  margin: 0;
  color: var(--muted);
  font-size: 13.5px;
}

.plan__section {
  display: grid;
  gap: 8px;
}

.plan__section h3 {
  margin: 0;
  font: 700 15px/1.2 var(--font-display);
}

.plan__section h3 small {
  margin-left: 6px;
  color: var(--muted);
  font: 500 12.5px var(--font-body);
}

.plan__list {
  overflow: hidden;
  border: 1px solid var(--line);
  border-radius: 12px;
  background: var(--surface-2);
}

.plan__group {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 9px 12px;
  background: var(--sunken);
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
}

.plan__group .mdi {
  color: var(--muted);
  font-size: 17px;
}

.plan__group-path {
  font-family: var(--font-mono);
  font-size: 12.5px;
}

.plan__count {
  margin-left: auto;
  color: var(--faint);
  font-weight: 500;
}

.plan__row {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr);
  align-items: start;
  gap: 12px;
  padding: 10px 12px;
  border-top: 1px solid var(--line);
  cursor: pointer;
}

.plan__list > .plan__row:first-child {
  border-top: 0;
}

.plan__row--on {
  background: var(--surface);
}

.plan__row--stale {
  opacity: 0.6;
  cursor: default;
}

.plan__row input,
.plan__group input {
  width: 17px;
  height: 17px;
  margin: 3px 0 0;
  accent-color: var(--accent);
}

.plan__main {
  display: grid;
  gap: 4px;
  min-width: 0;
}

.plan__map {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
}

.plan__map code {
  padding: 3px 7px;
  border: 1px solid var(--line);
  border-radius: 6px;
  background: var(--surface);
  font-size: 12.5px;
}

.plan__arrow {
  color: var(--faint);
}

.plan__entry {
  display: flex;
  align-items: center;
  gap: 9px;
  min-width: 0;
}

.plan__entry b {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.plan__icon {
  display: grid;
  place-items: center;
  flex: none;
  width: 26px;
  height: 26px;
  border-radius: 7px;
  font-size: 16px;
}

.plan__meta {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px;
  color: var(--muted);
  font-size: 12px;
}

.plan__tag {
  display: inline-flex;
  justify-self: start;
  padding: 2px 7px;
  border-radius: 999px;
  background: var(--warn-soft);
  color: var(--warn);
  font-size: 11.5px;
  font-weight: 600;
}

.plan__tag--new {
  background: var(--accent-soft);
  color: var(--accent);
}

.plan__preview {
  display: grid;
  gap: 6px;
}

.plan__step {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  padding: 9px 12px;
  border: 1px solid var(--line);
  border-radius: 10px;
  background: var(--surface-2);
  font-size: 13px;
}

.plan__step > .mdi {
  margin-top: 2px;
  color: var(--accent);
  font-size: 18px;
}

.plan__step small {
  display: block;
  margin-top: 4px;
  color: var(--muted);
  font-size: 12px;
}

.plan__hint {
  display: flex;
  align-items: flex-start;
  gap: 6px;
  margin: 0;
  color: var(--muted);
  font-size: 12.5px;
}

.plan__hint .mdi {
  color: var(--accent);
}

.plan__summary {
  flex: 1;
  min-width: 180px;
  color: var(--muted);
  font-size: 13px;
}
</style>
