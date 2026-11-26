<template>
  <DialogFrame
    :title="step === 'preview' ? t('cleanup.previewTitle') : t('cleanup.title')"
    is-wide
    @close="close"
    @submit="submit"
  >
    <template v-if="step === 'pick'">
      <p class="cleanup__intro">{{ t("cleanup.intro") }}</p>
      <p v-if="cleanup.isLoading && choices.length === 0" class="cleanup__intro">
        {{ t("cleanup.loading") }}
      </p>

      <section v-if="splits.length" class="cleanup__section">
        <div class="cleanup__section-head">
          <h3>
            {{ t("cleanup.splitTitle") }}<small>{{ splits.length }}</small>
          </h3>
          <button v-if="hasUntickedCertain" class="btn" type="button" @click="tickCertain">
            {{ t("cleanup.checkCertain") }}
          </button>
        </div>
        <div class="cleanup__list">
          <div
            v-for="choice in splits"
            :key="choice.key"
            class="cleanup__row"
            :class="{ 'cleanup__row--on': choice.isOn }"
          >
            <input
              v-model="choice.isOn"
              type="checkbox"
              :aria-label="t('cleanup.convert', { name: choice.from })"
            />
            <div class="cleanup__main">
              <div class="cleanup__map">
                <code>{{ choice.from }}</code>
                <span class="mdi mdi-arrow-right cleanup__arrow" />
                <input
                  v-model="choice.to"
                  class="field-input cleanup__target"
                  :aria-label="t('cleanup.targetFor', { name: choice.from })"
                  @change="choice.isOn = choice.to.trim() !== ''"
                />
              </div>
              <div class="cleanup__meta">
                <span>{{ countsText(choice.counts) }}</span>
                <span
                  v-if="!normalizeFolderPath(choice.to)"
                  class="cleanup__tag cleanup__tag--warn"
                >
                  <span class="mdi mdi-alert-circle-outline" />{{ t("cleanup.invalidPath") }}
                </span>
                <span v-if="!choice.isCertain" class="cleanup__tag cleanup__tag--warn">
                  <span class="mdi mdi-help-circle-outline" />{{ t("cleanup.uncertain") }}
                </span>
                <span v-if="sameTargetAs({ choice, choices })" class="cleanup__tag">
                  <span class="mdi mdi-call-merge" />{{
                    t("cleanup.sameTarget", { name: sameTargetAs({ choice, choices })?.from ?? "" })
                  }}
                </span>
                <span v-else-if="isExistingFolder(choice)" class="cleanup__tag">
                  <span class="mdi mdi-call-merge" />{{ t("cleanup.targetExists") }}
                </span>
              </div>
            </div>
            <button
              class="icon-btn"
              type="button"
              :title="t('cleanup.hide')"
              :aria-label="t('cleanup.hide')"
              @click="hide(choice.key)"
            >
              <span class="mdi mdi-eye-off-outline" />
            </button>
          </div>
        </div>
      </section>

      <section v-if="merges.length" class="cleanup__section">
        <div class="cleanup__section-head">
          <h3>
            {{ t("cleanup.mergeTitle") }}<small>{{ merges.length }}</small>
          </h3>
        </div>
        <div class="cleanup__list">
          <div
            v-for="choice in merges"
            :key="choice.key"
            class="cleanup__row"
            :class="{ 'cleanup__row--on': choice.isOn }"
          >
            <input
              v-model="choice.isOn"
              type="checkbox"
              :aria-label="t('cleanup.merge', { names: choice.names.join(t('cleanup.and')) })"
            />
            <div class="cleanup__main">
              <div class="cleanup__map">
                <template v-for="(name, index) in choice.names" :key="name">
                  <span v-if="index > 0" class="cleanup__arrow">+</span>
                  <code>{{ name }}</code>
                </template>
              </div>
              <div class="cleanup__meta">
                <span v-for="name in choice.names" :key="name">
                  {{ name }}: {{ countsText(choice.counts[name] ?? {}) }}
                </span>
              </div>
              <div class="cleanup__radios" role="radiogroup" :aria-label="t('cleanup.mergeName')">
                <span class="cleanup__meta">{{ t("cleanup.mergeName") }}</span>
                <label v-for="name in choice.names" :key="name">
                  <input v-model="choice.to" type="radio" :name="choice.key" :value="name" />
                  {{ name }}
                </label>
              </div>
            </div>
            <button
              class="icon-btn"
              type="button"
              :title="t('cleanup.hide')"
              :aria-label="t('cleanup.hide')"
              @click="hide(choice.key)"
            >
              <span class="mdi mdi-eye-off-outline" />
            </button>
          </div>
        </div>
      </section>

      <p v-if="!cleanup.isLoading && choices.length === 0" class="cleanup__nothing">
        <span class="mdi mdi-check-circle-outline" />{{ t("cleanup.nothing") }}
      </p>

      <div v-if="cleanup.ignoredCount" class="cleanup__hidden">
        <span class="mdi mdi-eye-off-outline" />
        {{ t("cleanup.hidden", { count: cleanup.ignoredCount }) }}
        <button class="btn" type="button" @click="restore">{{ t("cleanup.showHidden") }}</button>
      </div>
    </template>

    <template v-else>
      <p class="cleanup__intro">{{ t("cleanup.previewIntro") }}</p>
      <div v-for="group in stepGroups" :key="group.scope" class="cleanup__scope">
        <h4>{{ t(`scope.${SCOPE_KEY[group.scope]}`) }}</h4>
        <div
          v-for="item in group.steps"
          :key="item.from"
          class="cleanup__step"
          :class="{ 'cleanup__step--merge': item.kind === 'merge' }"
        >
          <span
            class="mdi"
            :class="item.kind === 'merge' ? 'mdi-call-merge' : 'mdi-pencil-outline'"
          />
          <div>
            <div class="cleanup__map">
              <code>{{ item.from }}</code>
              <span class="mdi mdi-arrow-right cleanup__arrow" />
              <code>{{ item.to }}</code>
            </div>
            <small>{{ stepText(item) }}</small>
            <small v-if="settings.isTechnicalDetailsVisible" class="cleanup__api">
              {{ apiText(item) }}
            </small>
          </div>
        </div>
      </div>
      <p class="cleanup__hint">
        <span class="mdi mdi-information-outline" />{{ t("cleanup.undoHint") }}
      </p>
    </template>

    <template #buttons>
      <span class="cleanup__summary">{{ summary }}</span>
      <template v-if="step === 'pick'">
        <button class="btn" type="button" :disabled="isBusy" @click="close">
          {{ t("common.cancel") }}
        </button>
        <button class="btn btn--primary" type="submit" :disabled="isBusy || changes.length === 0">
          {{ t("cleanup.next") }}
        </button>
      </template>
      <template v-else>
        <button class="btn" type="button" :disabled="isBusy" @click="step = 'pick'">
          {{ t("cleanup.back") }}
        </button>
        <button class="btn btn--primary" type="submit" :disabled="isBusy || steps.length === 0">
          {{ isBusy ? t("cleanup.running") : t("cleanup.apply") }}
        </button>
      </template>
    </template>
  </DialogFrame>
</template>

<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { useI18n } from "vue-i18n";

import DialogFrame from "@/components/common/DialogFrame.vue";
import type {
  CategoryScope,
  CleanupStep,
  ScopeCounts,
  SplitProposal,
} from "@/services/cleanupService";
import { useCleanupStore } from "@/stores/cleanupStore";
import { useFoldersStore } from "@/stores/foldersStore";
import { useMessagesStore } from "@/stores/messagesStore";
import { useSettingsStore } from "@/stores/settingsStore";
import { useToastStore } from "@/stores/toastStore";
import {
  normalizeFolderPath,
  sameTargetAs,
  toChanges,
  toChoices,
  totalCount,
  type CleanupChoice,
  type MergeChoice,
  type SplitChoice,
} from "@/utils/categories/cleanupSelection";

/**
 * The tidy-up assistant: pick the lines to convert, check what HA will do, then apply.
 * Nothing changes in HA before "Convert in Home Assistant".
 */
const props = defineProps<{
  /** Existing folder paths, to show when a target joins a folder that is already there. */
  allPaths: string[];
}>();

const emit = defineEmits<{
  close: [];
  /** HA was changed; the page reloads its data. */
  applied: [categoryCount: number];
}>();

const SCOPE_ORDER: CategoryScope[] = [
  "automation",
  "script",
  "scene",
  "helpers",
  "homeace_entities",
];
/** Backend scope → key below `scope.` in the locale files. */
const SCOPE_KEY: Record<CategoryScope, string> = {
  automation: "automation",
  script: "script",
  scene: "scene",
  helpers: "helper",
  homeace_entities: "entities",
};

const { t } = useI18n();
const cleanup = useCleanupStore();
const folders = useFoldersStore();
const messages = useMessagesStore();
const settings = useSettingsStore();
const toasts = useToastStore();

const step = ref<"pick" | "preview">("pick");
const choices = ref<CleanupChoice[]>(toChoices(cleanup.proposals));
const steps = ref<CleanupStep[]>([]);
const isBusy = ref(false);

// New proposals arrive after loading or hiding; lines keep what the user ticked and typed.
watch(
  () => cleanup.proposals,
  (proposals) => {
    const previous = new Map(choices.value.map((choice) => [choice.key, choice]));
    choices.value = toChoices(proposals).map((choice) => {
      const old = previous.get(choice.key);
      return old ? ({ ...choice, isOn: old.isOn, to: old.to } as CleanupChoice) : choice;
    });
  },
);

const splits = computed(() =>
  choices.value.filter((choice): choice is SplitChoice => choice.kind === "split"),
);
const merges = computed(() =>
  choices.value.filter((choice): choice is MergeChoice => choice.kind === "merge"),
);
const hasUntickedCertain = computed(() =>
  splits.value.some((choice) => choice.isCertain && !choice.isOn),
);
const changes = computed(() => toChanges(choices.value));

const summary = computed(() => {
  if (step.value === "preview") {
    const merged = steps.value.filter((item) => item.kind === "merge").length;
    const text = t("cleanup.changes", { count: steps.value.length }, steps.value.length);
    return merged ? `${text} · ${t("cleanup.summaryMerged", { count: merged })}` : text;
  }

  if (changes.value.length === 0) return t("cleanup.noneSelected");

  const names = new Set(changes.value.map((change) => change.from));
  const entries = choices.value
    .filter((choice) => choice.isOn)
    .reduce((sum, choice) => {
      if (choice.kind === "split") return sum + totalCount(choice.counts);
      const others = choice.names.filter((name) => name !== choice.to);
      return sum + others.reduce((part, name) => part + totalCount(choice.counts[name] ?? {}), 0);
    }, 0);

  return `${t("cleanup.summaryCategories", { count: names.size }, names.size)} · ${t(
    "cleanup.summaryEntries",
    { count: entries },
    entries,
  )}`;
});

const stepGroups = computed(() =>
  SCOPE_ORDER.map((scope) => ({
    scope,
    steps: steps.value.filter((item) => item.scope === scope),
  })).filter((group) => group.steps.length > 0),
);

function countsText(counts: ScopeCounts): string {
  const parts = SCOPE_ORDER.filter((scope) => counts[scope]).map(
    (scope) => `${t(`scope.${SCOPE_KEY[scope]}`)} ${counts[scope]}`,
  );

  return parts.join(" · ") || t("cleanup.empty");
}

function isExistingFolder(choice: SplitProposal): boolean {
  const target = normalizeFolderPath(choice.to);

  return target !== null && target !== choice.from && props.allPaths.includes(target);
}

function stepText(item: CleanupStep): string {
  const key = item.kind === "merge" ? "cleanup.stepMerge" : "cleanup.stepRename";

  return t(key, { count: item.entryCount, from: item.from, to: item.to }, item.entryCount);
}

function apiText(item: CleanupStep): string {
  return item.kind === "merge"
    ? `config/entity_registry/update × ${item.entryCount} · config/category_registry/delete`
    : "config/category_registry/update";
}

function tickCertain(): void {
  for (const choice of splits.value) {
    if (choice.isCertain) choice.isOn = true;
  }
}

function showError(error: unknown): void {
  toasts.show({
    text: messages.textFor({ error, fallback: t("errors.actionFailed") }),
    tone: "error",
  });
}

async function hide(key: string): Promise<void> {
  try {
    await cleanup.ignore(key);
    toasts.show({ text: t("toast.proposalHidden") });
  } catch (error) {
    showError(error);
  }
}

async function restore(): Promise<void> {
  try {
    await cleanup.restore();
  } catch (error) {
    showError(error);
  }
}

async function submit(): Promise<void> {
  if (isBusy.value) return;

  isBusy.value = true;

  try {
    if (step.value === "pick") {
      steps.value = await cleanup.preview(changes.value);
      step.value = "preview";
    } else {
      const categoryCount = await cleanup.apply(changes.value);
      // Folder colors and empty folders moved along in the overlay.
      await folders.load();
      emit("applied", categoryCount);
    }
  } catch (error) {
    showError(error);
  } finally {
    isBusy.value = false;
  }
}

function close(): void {
  if (!isBusy.value) emit("close");
}
</script>

<style scoped>
.cleanup__intro {
  margin: 0;
  color: var(--muted);
  font-size: 13.5px;
}

.cleanup__section {
  display: grid;
  gap: 8px;
}

.cleanup__section-head {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
}

.cleanup__section-head h3 {
  flex: 1;
  min-width: 180px;
  margin: 0;
  font: 700 15px/1.2 var(--font-display);
}

.cleanup__section-head small {
  margin-left: 6px;
  color: var(--muted);
  font: 500 12.5px var(--font-body);
}

.cleanup__list {
  overflow: hidden;
  border: 1px solid var(--line);
  border-radius: 12px;
  background: var(--surface-2);
}

.cleanup__row {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) auto;
  align-items: start;
  gap: 4px 12px;
  padding: 10px 8px 10px 12px;
  border-top: 1px solid var(--line);
}

.cleanup__row:first-child {
  border-top: 0;
}

.cleanup__row--on {
  background: var(--surface);
}

.cleanup__row > input[type="checkbox"] {
  width: 17px;
  height: 17px;
  margin: 7px 0 0;
  accent-color: var(--accent);
  cursor: pointer;
}

.cleanup__main {
  display: grid;
  gap: 6px;
  min-width: 0;
}

.cleanup__map {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
  min-width: 0;
}

.cleanup__map code {
  padding: 3px 7px;
  border: 1px solid var(--line);
  border-radius: 6px;
  background: var(--surface);
  white-space: nowrap;
}

.cleanup__arrow {
  color: var(--faint);
}

.cleanup__target {
  flex: 1 1 180px;
  width: auto;
  min-width: 0;
  height: 30px;
  font-family: var(--font-mono);
  font-size: 12.5px;
}

.cleanup__meta {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px;
  color: var(--muted);
  font-size: 12px;
}

.cleanup__tag {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 2px 7px;
  border-radius: 999px;
  background: var(--accent-soft);
  color: var(--accent);
  font-size: 11.5px;
  font-weight: 600;
}

.cleanup__tag--warn {
  background: var(--warn-soft);
  color: var(--warn);
}

.cleanup__radios {
  display: flex;
  flex-wrap: wrap;
  gap: 6px 14px;
  font-size: 13px;
}

.cleanup__radios label {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  cursor: pointer;
}

.cleanup__radios input {
  accent-color: var(--accent);
}

.cleanup__nothing {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  margin: 0;
  padding: 24px;
  color: var(--muted);
}

.cleanup__hidden {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px;
  color: var(--muted);
  font-size: 12.5px;
}

.cleanup__scope {
  display: grid;
  gap: 6px;
}

.cleanup__scope h4 {
  margin: 6px 0 0;
  color: var(--faint);
  font-size: 11.5px;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.cleanup__step {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  padding: 9px 12px;
  border: 1px solid var(--line);
  border-radius: 10px;
  background: var(--surface-2);
  font-size: 13px;
}

.cleanup__step > .mdi {
  margin-top: 2px;
  color: var(--accent);
  font-size: 18px;
}

.cleanup__step--merge > .mdi {
  color: var(--warn);
}

.cleanup__step small {
  display: block;
  margin-top: 4px;
  color: var(--muted);
  font-size: 12px;
}

.cleanup__step .cleanup__api {
  color: var(--faint);
  font-family: var(--font-mono);
  font-size: 11.5px;
}

.cleanup__hint {
  display: flex;
  align-items: flex-start;
  gap: 6px;
  margin: 0;
  color: var(--muted);
  font-size: 12.5px;
}

.cleanup__hint .mdi {
  color: var(--accent);
}

.cleanup__summary {
  flex: 1;
  min-width: 180px;
  color: var(--muted);
  font-size: 13px;
}

@media (max-width: 820px) {
  .cleanup__row {
    grid-template-columns: auto minmax(0, 1fr);
  }

  .cleanup__row > .icon-btn {
    grid-column: 2;
    justify-self: start;
    margin-left: -8px;
  }
}
</style>
